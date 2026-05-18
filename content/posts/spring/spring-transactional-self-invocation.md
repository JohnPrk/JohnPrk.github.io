---
title: "Spring @Transactional이 같은 클래스 안에서는 동작하지 않는 이유"
category: "spring"
slug: "spring-transactional-self-invocation"
num: 9
date: 2026-05-18
description: "Spring @Transactional은 프록시 기반이라 외부에서 들어온 호출만 가로챈다. 같은 객체 내부에서 this.method()로 부른 호출은 프록시를 거치지 않아 트랜잭션 propagation이 무시된다. 실측으로 확인하고 @Lazy self 주입과 ApplicationContext lookup으로 우회하는 방법을 정리한다."
tags: ["spring", "@Transactional", "AOP", "프록시", "우테코"]
---

우테코 레벨2 미션에서 DB를 붙인 직후, PR 리뷰 한 줄이 들어왔다.

> p2: DB를 적용했는데 트랜잭션 경계가 없네요! spring에서 트랜잭션을 어떻게 구현하는지 학습해보고 적용해보시죠~(숙제📚)

`@Transactional`을 service 메서드에 붙이는 거야 익숙한데, 문서를 읽다 보니 한 줄이 걸렸다. *self-invocation은 프록시를 우회한다*. 그게 정확히 어떤 상황을 말하는지, 그리고 우회를 정말 우회할 수 있는지 직접 돌려서 확인했다.

## 발견: 같은 클래스 내부 호출에선 propagation이 무시된다

먼저 가장 단순한 시나리오. 한 클래스 안에 `outer()`와 `inner()` 두 트랜잭션 메서드가 있고, `outer()`가 `this.inner()`를 부른다. `inner()`에는 `Propagation.REQUIRES_NEW`를 걸어 두면, 새 트랜잭션이 시작되어야 정상이다.

```java
@Transactional
public void outer() {
    printTxState("outer");
    this.inner();
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void inner() {
    printTxState("inner");
}

private void printTxState(String label) {
    boolean active = TransactionSynchronizationManager.isActualTransactionActive();
    String name = TransactionSynchronizationManager.getCurrentTransactionName();
    System.out.println("  [" + label + "] active=" + active + ", name=" + name);
}
```

실행 결과.

```
  [outer] active=true, name=roomescape.blog.SelfInvocationStudyTest$SelfInvocationDemo.outer
  [inner] active=true, name=roomescape.blog.SelfInvocationStudyTest$SelfInvocationDemo.outer
```

`inner`의 transaction name이 `inner`가 아니라 `outer`다. 같은 트랜잭션이 그대로 흘러간 셈. `REQUIRES_NEW`가 무시됐다는 의미다. 왜 무시되는지는 공식 문서가 한 줄로 답해준다.

## 원리 1: @Transactional은 프록시 기반이다

Spring Framework Reference의 Declarative Transaction Management 페이지에서 한 단락.

> In proxy mode (which is the default), only external method calls coming in through the proxy are intercepted. This means that self-invocation (in effect, a method within the target object calling another method of the target object) does not lead to an actual transaction at runtime even if the invoked method is marked with `@Transactional`.

핵심 구절을 두 토막으로 끊으면 이렇다.

1. *only external method calls coming in through the proxy are intercepted* (프록시를 거쳐 들어오는 외부 호출만 가로채진다)
2. *self-invocation ... does not lead to an actual transaction at runtime even if the invoked method is marked with @Transactional* (대상 객체 내부에서 자기 자신의 다른 메서드를 호출하는 self-invocation은 그 메서드에 @Transactional이 붙어 있어도 실제 트랜잭션을 일으키지 않는다)

`@Transactional`은 Spring AOP가 만들어 둔 프록시 객체가 가로채서 처리한다. 그러니까 프록시를 거치지 않는 호출은 처리될 수가 없다. 그게 self-invocation의 정의다.

## 원리 2: 왜 this.method()는 프록시를 거치지 않는가

AOP Proxying Mechanisms 페이지의 설명이 자세하다.

> However, once the call has finally reached the target object (the `SimplePojo` reference in this case), any method calls that it may make on itself, such as `this.bar()` or `this.foo()`, are going to be invoked against the `this` reference, and not the proxy. This has important implications. It means that self invocation is not going to result in the advice associated with a method invocation getting a chance to run. In other words, self invocation via an explicit or implicit `this` reference will bypass the advice.

흐름을 그림으로 정리하면 이렇다.

```
Caller ──> Proxy ──> Target (this)
                       │
                       └─ this.bar()  // 프록시 우회. Target 안에서 바로 호출.
```

Caller가 부른 첫 메서드는 프록시가 잡는다. 그 프록시가 트랜잭션을 시작하고, 본체 객체(target)의 메서드를 호출한다. 거기까지는 정상. 그런데 본체 안에서 또 다른 메서드를 부를 때 쓰는 `this`는 프록시가 아니라 본체 자기 자신이다. 프록시를 거칠 일이 없으니 트랜잭션 어드바이스가 끼어들 자리도 없다.

내가 주입받은 빈의 실제 클래스를 출력해보면 더 분명해진다.

```java
@Test
void 주입된_빈은_프록시이다() {
    System.out.println("[bean class] " + demo.getClass().getName());
}
```

```
[bean class] roomescape.blog.SelfInvocationStudyTest$SelfInvocationDemo$$SpringCGLIB$$1
```

`$$SpringCGLIB$$1`이 붙어 있다. 즉 Spring이 CGLIB로 만든 서브클래스 프록시다. 외부 코드에서 `demo.outer()`로 부르면 이 프록시의 `outer()`가 호출되고, 거기서 트랜잭션이 열린다. 그런데 `outer()` 본체 안의 `this.inner()`는 프록시가 아니라 원본 객체의 `inner()`를 직접 호출하므로 프록시가 빠진다.

## 실측 매칭: 우회를 우회하는 두 가지 방법

그러면 프록시를 명시적으로 거치게 만들면 self-invocation 문제는 사라질까. 두 가지 방식을 같은 클래스에 추가해서 비교했다.

```java
static class SelfInvocationDemo {

    @Autowired
    private ApplicationContext context;

    @Autowired
    @Lazy
    private SelfInvocationDemo lazySelf;

    @Transactional
    public void outer() {
        printTxState("outer");
        this.inner();                              // (1) self-invocation
    }

    @Transactional
    public void outerWithLazySelf() {
        printTxState("outerWithLazySelf");
        lazySelf.inner();                          // (2) @Lazy로 주입받은 자기 자신 프록시
    }

    @Transactional
    public void outerWithContextLookup() {
        printTxState("outerWithContextLookup");
        SelfInvocationDemo proxy = context.getBean(SelfInvocationDemo.class);
        proxy.inner();                             // (3) ApplicationContext에서 직접 lookup
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void inner() {
        printTxState("inner");
    }
}
```

세 케이스 실행 결과를 한 표로 합치면 이렇다.

| 케이스 | outer transaction name | inner transaction name | inner이 새 트랜잭션? |
|---|---|---|---|
| `this.inner()` | `...SelfInvocationDemo.outer` | `...SelfInvocationDemo.outer` | 아니오 |
| `lazySelf.inner()` | `...SelfInvocationDemo.outerWithLazySelf` | `...SelfInvocationDemo.inner` | 예 |
| `getBean().inner()` | `...SelfInvocationDemo.outerWithContextLookup` | `...SelfInvocationDemo.inner` | 예 |

(1)에서는 inner의 transaction name이 outer와 같다. propagation이 무시된 증거. (2), (3)에서는 inner의 transaction name이 다르다. 새 트랜잭션이 시작됐다는 증거. 두 우회 방식 모두 프록시를 명시적으로 거치므로 어드바이스가 정상적으로 작동했다.

## @Lazy가 왜 필요한가

처음에는 `@Lazy` 없이 그냥 `@Autowired private SelfInvocationDemo self;`로 자기 자신을 주입하려고 했다. 그러자 ApplicationContext 로드 단계에서 실패했다.

```
java.lang.IllegalStateException: Failed to load ApplicationContext
Caused by: org.springframework.beans.factory.UnsatisfiedDependencyException:
  Error creating bean with name 'demo': Unsatisfied dependency expressed through field 'self':
  Error creating bean with name 'demo': Requested bean is currently in creation:
  Is there an unresolvable circular reference or an asynchronous initialization dependency?
```

Spring Boot 2.6부터 `spring.main.allow-circular-references`의 기본값이 `false`로 바뀌어서, 자기 자신을 주입하는 것조차 순환 참조로 보고 거부한다. `@Lazy`를 붙이면 의존성을 프록시로 감싸 늦게 해결해 주므로 컨테이너 구성 시점에는 순환 참조가 발생하지 않는다. 실제 메서드를 부르는 순간에야 프록시가 실체를 찾아온다. self-injection의 표준 해법이 반드시 `@Lazy`와 짝인 이유가 여기 있다.

## 또 하나의 해법: AspectJ 모드

공식 문서는 세 번째 해법을 따로 짚는다.

> Consider using AspectJ mode (see the `mode` attribute in the following table) if you expect self-invocations to be wrapped with transactions as well. In this case, there is no proxy in the first place. Instead, the target class is woven (that is, its byte code is modified) to support `@Transactional` runtime behavior on any kind of method.

AspectJ 모드는 프록시를 아예 쓰지 않고 클래스 바이트코드 자체를 변경(weaving)한다. 그러면 `this.method()` 호출도 메서드 진입 시점에 트랜잭션 어드바이스가 끼어드는 형태로 바뀌어서 self-invocation 문제 자체가 사라진다. 실측까지 가진 않았다. 일반 프로젝트에서는 빌드 설정 비용이 커서 거의 쓰이지 않고, 왜 self-invocation 우회가 프록시 모델 자체의 한계인지를 이해하는 보조 자료로만 쓰면 된다.

## 부록: JDK vs CGLIB 프록시 선택 규칙

내가 주입받은 빈이 CGLIB 프록시였던 이유를 공식 문서가 명시한다.

> If the target object to be proxied implements at least one interface, a JDK dynamic proxy is used, and all of the interfaces implemented by the target type are proxied.
>
> If the target object does not implement any interfaces, a CGLIB proxy is created which is a runtime-generated subclass of the target type.

`SelfInvocationDemo`가 인터페이스를 구현하지 않았기 때문에 CGLIB 프록시(런타임 서브클래스)가 만들어졌다. 만약 인터페이스를 구현한 빈이라면 JDK 동적 프록시가 생성되었을 것이고, 둘 중 어느 쪽이든 self-invocation 문제는 동일하게 발생한다. 프록시 종류가 본질이 아니라 *프록시가 외부 호출만 가로챈다는 사실*이 본질이기 때문이다.

## 학습 테스트 셋업 함정 한 가지

처음 테스트를 짤 때 다음과 같이 시작했다.

```java
@SpringBootTest
class SelfInvocationStudyTest {
    @Configuration
    static class TestConfig {
        @Bean
        SelfInvocationDemo demo() { return new SelfInvocationDemo(); }
    }
}
```

이렇게 두면 `static class TestConfig`가 유일한 SpringBootConfiguration으로 잡혀 메인 애플리케이션의 DataSource와 TransactionManager 자동 설정이 누락된다. 모든 케이스가 `active=false`로 떨어져서 self-invocation 문제 자체를 관찰할 수 없는 상태가 된다.

해결은 `@SpringBootTest`에 메인 애플리케이션 클래스를 명시하고 `@Import`로 테스트 전용 빈만 얹는 것.

```java
@SpringBootTest(classes = RoomescapeApplication.class)
@Import(SelfInvocationStudyTest.TestConfig.class)
class SelfInvocationStudyTest { ... }
```

이러면 메인 컨텍스트 위에 demo 빈만 얹혀 정상적으로 트랜잭션이 활성화된다. 트랜잭션 학습 테스트를 짤 때 내부 컨테이너가 메인 자동 설정을 포함하고 있는지는 함정으로 자주 만난다.

## 종합 표

| 호출 방식 | 프록시 경유? | 트랜잭션 어드바이스 적용? | propagation 작동? |
|---|---|---|---|
| `this.inner()` | 아니오 | 아니오 | 아니오 |
| `@Lazy self.inner()` | 예 | 예 | 예 |
| `context.getBean(...).inner()` | 예 | 예 | 예 |
| (참고) AspectJ 모드의 `this.inner()` | 프록시 자체가 없음, 바이트코드에 직접 weaving | 예 | 예 |

## 정리

- Spring `@Transactional`은 **프록시 기반**이다. AOP 프록시가 메서드 호출을 가로채야 어드바이스가 실행되고, 트랜잭션도 그 어드바이스의 일부다.
- 프록시는 외부에서 들어오는 호출만 가로챈다. 본체 객체 안에서 `this.method()`로 부른 호출은 프록시를 거치지 않으므로 어드바이스도 실행되지 않는다.
- 그래서 `@Transactional` 메서드 안에서 같은 클래스의 다른 `@Transactional` 메서드를 `this`로 부르면 propagation 설정이 무시되고 같은 트랜잭션이 그대로 흐른다.
- 우회 방법은 프록시를 명시적으로 거치는 것이다. `@Lazy`로 주입받은 self, `ApplicationContext.getBean(...)`으로 가져온 빈, 또는 AspectJ 모드. 셋 다 공통점은 "this를 안 쓴다".
- self-injection은 Spring Boot 2.6+에서 반드시 `@Lazy`와 짝이어야 한다. 순환 참조 금지가 기본이라 그냥 주입하면 컨텍스트 로드 자체가 실패한다.
- 인터페이스 유무에 따라 JDK 동적 프록시 또는 CGLIB 서브클래스 프록시가 선택된다. 어느 쪽이든 self-invocation 동작은 같다.

## 다음에 쓸 때의 자기 룰

- `@Transactional` 메서드가 같은 클래스의 다른 `@Transactional` 메서드를 부르면 멈춘다. propagation을 설계 의도대로 쓰려면 그 호출을 다른 빈으로 분리하거나 `@Lazy` self 주입으로 푼다.
- 메서드 분리와 self-injection 사이의 선택은 책임 분리가 자연스러운지로 판단한다. 자연스러우면 분리(보통 이쪽이 좋다), 인위적이면 `@Lazy` self.
- 트랜잭션 테스트를 짤 때 내부 `@Configuration` 클래스만으로는 메인 자동 설정이 누락될 수 있다. `@SpringBootTest(classes = ...)` + `@Import`로 컨텍스트를 명시하는 게 안전.
- self-invocation 함정을 의심할 때는 주입받은 빈의 실제 클래스명을 출력해보면 빠르다. `$$SpringCGLIB$$` 또는 `$Proxy`가 붙어 있으면 프록시가 들어 있는 것.
