---
title: "@Transactional 한 줄을 따라가다 만난 프록시, 두 인터페이스, 그리고 롤백의 책임 소재"
category: "spring"
slug: "spring-transactional-internals"
num: 10
date: 2026-05-18
description: "우테코 룸이스케이프 미션에서 서비스에 @Transactional을 막 적용한 직후, 컨테이너 빈을 꺼내봤더니 $$SpringCGLIB$$0이 붙어 있었다. 거기서부터 따라가니 AOP 프록시의 정체, TransactionInterceptor와 PlatformTransactionManager의 JavaDoc, self-invocation이 깨지는 자리, 그리고 가장 큰 오해 한 가지가 풀렸다. Spring은 내 쿼리를 기억하지 않는다. 롤백은 DB의 책임이고 Spring은 시점만 결정한다."
tags: ["스프링", "@Transactional", "AOP", "프록시", "TransactionInterceptor", "PlatformTransactionManager", "트랜잭션", "우테코"]
---

### 시작점, 한 줄짜리 PR 리뷰에서 출발한 정리

우테코 룸이스케이프 admin 미션에서 DB를 붙인 직후, PR 리뷰 한 줄이 들어왔다.

> p2: DB를 적용했는데 트랜잭션 경계가 없네요! spring에서 트랜잭션을 어떻게 구현하는지 학습해보고 적용해보시죠~(숙제📚)

서비스 메서드에 `@Transactional`을 붙이는 건 익숙했는데, 정작 *이 한 줄이 정확히 무엇을 만들어 내는가*가 흐릿했다. 적용 자체는 한 줄이다.

```java
@Service
public class ThemeService {

    @Transactional
    public Theme save(...) { ... }
}
```

가장 먼저 확인한 건 컨테이너에 정말 무엇이 들어가 있는가였다.

```java
ConfigurableApplicationContext run = SpringApplication.run(Application.class, args);
System.out.println(run.getBean("themeService").getClass());
```

출력.

```
class roomescape.service.ThemeService$$SpringCGLIB$$0
```

내가 짠 클래스는 `roomescape.service.ThemeService`다. 그런데 컨테이너에서 꺼내보니 같은 이름 뒤에 `$$SpringCGLIB$$0`이 붙어 있다. 이름이 다르면 클래스가 다르고, 클래스가 다르면 객체가 다르다. 컨테이너에 들어 있는 건 내 ThemeService가 *아니라* 그것을 상속한 다른 클래스다.

이 한 줄짜리 출력이 글의 출발점이다. 따라간 질문은 네 개였다.

1. 컨테이너가 진짜 객체 대신 *프록시*를 넣어두는 이유는 무엇인가
2. 가로챈 호출은 누구에게 넘어가는가 (`TransactionInterceptor`)
3. 그 누군가는 무엇을 부르는가 (`PlatformTransactionManager`)
4. 롤백할 때 Spring이 내 SQL을 기억해서 반대로 돌리는가

네 번째가 가장 헷갈렸다. update 한 줄, insert 두 줄, delete 한 줄이 섞여 있는 트랜잭션을 롤백할 때, 누군가는 그 네 줄을 모두 기억하고 있다가 반대로 실행해야 할 텐데, 그 주체가 Spring인가 DB인가가 잘 그려지지 않았다.

답을 잡으려고 공식 문서까지 거슬러 올라갔다.

### AOP가 풀려고 했던 자리

객체지향 프로그래밍은 *수직적 분해*에 강하다. 도메인을 클래스 계층으로 나누고, 책임을 메서드로 분리한다. 그런데 어떤 관심사들은 *수평으로 흐른다*. 클래스 계층과 직교한다.

- 로깅, 모든 메서드 진입과 종료에 찍고 싶음
- 트랜잭션, 모든 서비스 메서드를 begin/commit으로 감싸고 싶음
- 보안, 모든 컨트롤러 메서드 진입 전에 권한 체크하고 싶음

이걸 OOP만으로 풀면 모든 메서드에 try-catch를 박거나, 상속 트리에 끼워 넣어야 한다. 두 방법 다 어색하다. 횡으로 흐르는 관심사가 종인 클래스 계층과 어긋나기 때문이다.

AOP (Aspect-Oriented Programming, 관점 지향 프로그래밍)는 이런 *횡단 관심사*를 따로 모으는 패러다임이다. 핵심 용어 다섯 개를 트랜잭션 예시로 정리하면 이렇다.

| 용어 | 의미 | 트랜잭션 예시 |
|---|---|---|
| Aspect | 횡단 관심사 모듈 | `TransactionInterceptor` 클래스 |
| Joinpoint | aspect를 끼울 수 있는 지점 | 메서드 호출 |
| Pointcut | 어떤 joinpoint에 적용할지 선택 규칙 | `@Transactional` 붙은 모든 메서드 |
| Advice | 해당 지점에서 실행되는 코드 | begin/commit/rollback 로직 |
| Weaving | aspect를 대상 코드와 엮는 과정 | 빈 생성 시 프록시로 감쌈 |

Advice의 종류는 다섯 가지가 있다. Before, After, AfterReturning, AfterThrowing, Around. `@Transactional`은 가장 강력한 Around에 해당한다. 메서드 실행 *전과 후* 양쪽에 끼어들 수 있고, 예외 처리까지 둘러쌀 수 있다.

### Spring AOP는 프록시 기반이다

Spring 공식 문서는 Spring AOP의 구현 방식을 한 단락으로 못 박는다.

> Spring AOP is implemented in pure Java. There is no need for a special compilation process. Spring AOP currently supports only method execution joinpoints (advising the execution of methods on Spring beans). Spring AOP uses either JDK dynamic proxies or CGLIB to create the proxy for a given target object.

핵심은 *프록시*다. 원본 빈을 감싸는 대리인 객체를 만들고, 모든 메서드 호출을 가로채 Advice를 실행한 뒤 원본을 호출한다.

두 가지 프록시 방식이 있다.

**JDK Dynamic Proxy.** 인터페이스 구현체를 동적으로 생성한다.

```java
public interface UserService { void save(User u); }

@Service
public class UserServiceImpl implements UserService { ... }

// 런타임에 Spring이 만드는 것 (개념)
UserService proxy = (UserService) Proxy.newProxyInstance(
    classLoader,
    new Class[]{UserService.class},
    (proxyObj, method, args) -> {
        // Advice 실행
        return method.invoke(realTarget, args);
    }
);
```

인터페이스가 없으면 못 만든다.

**CGLIB Proxy.** 클래스를 상속해 동적으로 새 클래스를 생성한다.

```java
@Service
public class UserService {   // 인터페이스 없음
    public void save(User u) { ... }
}

// 런타임에 Spring이 만드는 것 (개념)
class UserService$$SpringCGLIB$$0 extends UserService {
    @Override
    public void save(User u) {
        // Advice 실행
        super.save(u);
    }
}
```

바이트코드 조작으로 *상속한 새 클래스*를 동적 생성한다. 단 `final` 클래스나 `final` 메서드는 못 막는다는 한계가 있다.

Spring Boot 2.0부터는 기본이 CGLIB다. 인터페이스 유무와 무관하게 일관되게 동작하기 위해서다. `application.properties`에서 `spring.aop.proxy-target-class=true`가 기본값.

내 미션 코드의 `ThemeService`는 인터페이스를 구현하지 않았다. 그래서 컨테이너에 들어간 클래스가 `ThemeService$$SpringCGLIB$$0`이라는 *서브클래스*였다. 인터페이스가 있었다면 `$Proxy0` 같은 JDK 동적 프록시가 만들어졌을 것이다. AOP Proxying Mechanisms 페이지가 선택 규칙을 그대로 적어둔다.

> If the target object to be proxied implements at least one interface, a JDK dynamic proxy is used, and all of the interfaces implemented by the target type are proxied.
>
> If the target object does not implement any interfaces, a CGLIB proxy is created which is a runtime-generated subclass of the target type.

### 프록시는 언제 만들어지는가

빈 생명주기 안에서 *후처리 단계*에 끼어든다.

```
1. 빈 정의 스캔
2. 빈 인스턴스 생성 (원본 객체)
3. BeanPostProcessor 체인 실행
   AnnotationAwareAspectJAutoProxyCreator가 마지막에 끼어들어:
     a) 이 빈이 advice 대상인지 검사 (Pointcut 매칭)
     b) 대상이면 원본을 감싸는 프록시 생성
     c) 컨테이너에 *프록시*를 등록 (원본은 프록시 내부 target 필드에 보관)
4. DI 시 프록시를 주입
```

`@Autowired UserService service`로 받은 객체가 사실 프록시다. `service.getClass().getName()`을 찍어보면 `UserService$$SpringCGLIB$$0` 같은 이름이 나온다. 내 미션 코드에서도 `getBean("themeService").getClass()` 출력이 정확히 이 형태였다.

여기서 한 가지를 짚고 가자. **프록시와 원본 ThemeService는 힙에서 별개의 객체다.** 같은 메모리 자리에 마법처럼 트랜잭션 코드가 끼워진 게 아니다. CGLIB이 런타임에 바이트코드로 새 클래스를 만들고, 그 새 클래스의 인스턴스를 컨테이너에 넣었다. 원본 인스턴스는 그 프록시의 필드(`target`)로 들어가 있을 뿐이다. 이 사실이 뒤에서 self-invocation을 설명할 때 다시 등장한다.

### 가로챈 호출은 TransactionInterceptor로 간다

advice 체인에서 트랜잭션을 담당하는 인터셉터의 정체를 공식 JavaDoc에서 확인했다.

> AOP Alliance MethodInterceptor for declarative transaction management using the common Spring transaction infrastructure (`PlatformTransactionManager` / `ReactiveTransactionManager`).
>
> ([TransactionInterceptor JavaDoc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/interceptor/TransactionInterceptor.html))

상속 구조도 분명하다.

```java
public class TransactionInterceptor
        extends TransactionAspectSupport
        implements MethodInterceptor, ApplicationEventPublisherAware, Serializable
```

`MethodInterceptor`는 AOP Alliance가 정한 표준 인터페이스이고, 메서드는 단 하나다.

```java
@Nullable
Object invoke(MethodInvocation invocation) throws Throwable;
```

JavaDoc은 이 메서드에 무엇이 들어가야 하는지 한 줄로 설명한다.

> Implement this method to perform extra treatments before and after the invocation. Polite implementations would certainly like to invoke `Joinpoint.proceed()`.

전·후처리를 끼우라는 자리. `Joinpoint.proceed()`가 곧 원본 메서드 호출이다. `TransactionInterceptor.invoke`가 하는 일은 그 proceed 앞에 트랜잭션 시작을 끼우고, 뒤에 commit/rollback을 끼우는 것이다.

그런데 코드를 보면 `invoke`는 의외로 짧다. 실제 로직은 부모 클래스 `TransactionAspectSupport`로 위임된다.

> Base class for transactional aspects, such as the `TransactionInterceptor` or an AspectJ aspect.
>
> Uses the **Strategy** design pattern. A `PlatformTransactionManager` or `ReactiveTransactionManager` implementation will perform the actual transaction management, and a `TransactionAttributeSource` (for example, annotation-based) is used for determining transaction definitions for a particular class or method.
>
> ([TransactionAspectSupport JavaDoc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/interceptor/TransactionAspectSupport.html))

이 부모 클래스 안에 `invokeWithinTransaction`이라는 메서드가 있고, 그게 around-advice의 본체다. JavaDoc은 이를 "general delegate for around-advice-based subclasses"라고 설명한다. 단계는 이렇다.

1. 적용할 `TransactionManager`를 결정한다 (`determineTransactionManager`).
2. 필요하면 트랜잭션을 시작한다 (`createTransactionIfNecessary`).
3. 트랜잭션 정보를 ThreadLocal에 보관한다 (`prepareTransactionInfo`).
4. 콜백을 통해 원본 메서드를 실행한다.
5. 정상 종료면 커밋한다 (`commitTransactionAfterReturning`).
6. 예외가 났으면 롤백 여부를 판단한다 (`completeTransactionAfterThrowing`).
7. ThreadLocal을 정리한다 (`cleanupTransactionInfo`).

가장 중요한 것은 **이 모든 단계가 트랜잭션의 시작/종료 시점만 결정한다**는 것이다. 실제로 DB와 통신해서 트랜잭션을 시작하거나 끝내는 건 다음에 나올 `PlatformTransactionManager` 구현체가 한다.

### PlatformTransactionManager는 메서드가 셋뿐인 전략 인터페이스

JavaDoc부터 본다.

> This is the central interface in Spring's imperative transaction infrastructure. Applications can use this directly, but it is not primarily meant as an API: Typically, applications will work with either TransactionTemplate or declarative transaction demarcation through AOP.
>
> A classic implementation of this strategy interface is `JtaTransactionManager`. However, in common single-resource scenarios, Spring's specific transaction managers for example, JDBC, JPA, JMS are preferred choices.
>
> Since: 16.05.2003
> Author: Rod Johnson, Juergen Hoeller
>
> ([PlatformTransactionManager JavaDoc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/PlatformTransactionManager.html))

흥미로운 한 줄이 박혀 있다. **Since: 16.05.2003.** Spring 1.0 정식 릴리스가 2004년 3월이니, 정식 1.0이 나오기 거의 1년 전에 이미 이 인터페이스가 자리잡았다는 뜻이다. 트랜잭션 추상화가 Spring이라는 프레임워크의 *초기 골격*이었다는 사실이 작성자 이름과 함께 확인된다.

메서드는 셋뿐이다.

#### getTransaction

```java
TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
        throws TransactionException;
```

> Return a currently active transaction or create a new one, according to the specified propagation behavior.
>
> Note that parameters like isolation level or timeout will only be applied to new transactions, and thus be ignored when participating in active ones.

이름이 "create"가 아니라 "get"인 데에는 의도가 있다. 호출 시점에 이미 활성 트랜잭션이 있으면 (`PROPAGATION_REQUIRED`로 들어왔는데 바깥 메서드가 이미 트랜잭션이라면) 그것을 *재사용*하고, 없으면 새로 만든다. 반환되는 `TransactionStatus`는 *이 트랜잭션이 새 것인지, 이미 진행 중이던 것에 참여한 건지* 같은 상태 정보를 들고 있다.

#### commit

```java
void commit(TransactionStatus status) throws TransactionException;
```

> Commit the given transaction, with regard to its status. If the transaction has been marked rollback-only programmatically, perform a rollback.
>
> If the transaction wasn't a new one, omit the commit for proper participation in the surrounding transaction.

두 가지가 눈에 들어온다. 첫째, rollback-only로 마킹돼 있으면 commit이 알아서 rollback으로 바뀐다. 둘째, *내가 시작한 트랜잭션이 아니면 commit을 생략한다.* 안쪽 메서드가 commit을 부른다고 해서 바깥 트랜잭션까지 마음대로 끝내지 않는다는 뜻이다. 안쪽은 "내 일 끝났다"만 표시하고, 실제 종료는 가장 바깥 호출이 한다.

#### rollback

```java
void rollback(TransactionStatus status) throws TransactionException;
```

> Perform a rollback of the given transaction.
>
> If the transaction wasn't a new one, just set it rollback-only for proper participation in the surrounding transaction.
>
> **Do not call rollback on a transaction if commit threw an exception.** The transaction will already have been completed and cleaned up when commit returns, even in case of a commit exception.

여기서 두 줄짜리 큰 사실이 나온다.

- 내가 시작한 트랜잭션이 아니면 그냥 rollback-only 플래그만 켠다. 실제 롤백은 가장 바깥쪽 호출이 한다.
- commit이 예외를 던졌으면 다시 rollback을 부르면 안 된다. 이미 정리됐다.

우아한형제들 기술블로그 ["Spring Transaction 마음대로 롤백되네"](https://techblog.woowahan.com/2606/) 글이 이 첫째 줄의 변종을 다룬다. 안쪽 메서드에서 RuntimeException이 났는데 바깥에서 try-catch로 삼킨 케이스다. 안쪽이 이미 트랜잭션을 rollback-only로 마킹한 상태인데 바깥이 정상 commit을 시도하니, 결과적으로 `UnexpectedRollbackException`이 튀어나온다. 본문에 그대로 인용된 표현이 있다.

> "If a participating transaction fails, the transaction will be globally marked as rollback-only."

이 동작은 `AbstractPlatformTransactionManager`의 `isGlobalRollbackOnParticipationFailure()`가 기본값 `true`라서 발생한다. 안쪽이 RuntimeException을 던지는 순간 바깥 트랜잭션도 함께 죽기로 예약된다.

### 호출 한 번이 거치는 전체 흐름

지금까지의 조각을 한 호흡으로 묶으면 이렇다.

```
Controller
    │  themeService.save(req)
    ▼
ThemeService$$SpringCGLIB$$0  ← getBean()이 반환한 그 객체
    │
    │  오버라이드된 save()가 호출됨
    │
    ▼
TransactionInterceptor.invoke(invocation)
    │
    ▼  부모 클래스로 위임
TransactionAspectSupport.invokeWithinTransaction(...)
    │
    ├─ 1) txManager.getTransaction(def)
    │      └─ DataSourceTransactionManager가
    │         DataSource에서 Connection을 꺼내고
    │         conn.setAutoCommit(false)를 호출
    │         이 Connection을 ThreadLocal에 바인딩
    │
    ├─ 2) try {
    │         target.save(req)   ← 진짜 ThemeService.save() 실행
    │                              안쪽의 JdbcTemplate은
    │                              ThreadLocal에 바인딩된 같은 Connection을 사용
    │     } catch (ex) {
    │         완료(완료 = commit 또는 rollback)
    │         throw ex
    │     }
    │
    ├─ 3a) 정상 종료: txManager.commit(status)
    │       └─ conn.commit()
    │       └─ 풀에 Connection 반환
    │
    └─ 3b) 예외 + 롤백 대상: txManager.rollback(status)
            └─ conn.rollback()
            └─ 풀에 Connection 반환
```

이 그림에서 가장 중요한 부분은 **Spring이 직접 SQL을 보내지 않는다**는 것이다. Spring은 Connection의 `setAutoCommit`, `commit`, `rollback` 같은 JDBC API를 시점에 맞춰 호출할 뿐이다. 이 사실이 글의 마지막 큰 발견과 직결된다.

### 가장 큰 오해, Spring은 내 쿼리를 기억하지 않는다

처음 흐릿했던 네 번째 질문의 답이 여기 있다. update 한 줄, insert 두 줄, delete 한 줄이 섞여 있을 때 Spring이 그 네 줄을 어딘가에 보관해 두었다가 반대로 돌리는 일은 *없다*. Spring의 `rollback`은 JDBC 표준 메서드 호출 한 줄이다.

```java
// 의사 코드 수준의 단순화
public void rollback(TransactionStatus status) {
    Connection conn = (얻어둔 Connection);
    conn.rollback();   // 끝
}
```

되돌리는 일은 *DB가 직접 한다.* 어떻게? 그건 DB 엔진마다 자기 방식이 있다.

- **InnoDB (MySQL)**: 트랜잭션 동안 변경된 모든 행에 대해 *undo log*를 자동으로 기록한다. `ROLLBACK` 명령이 오면 그 undo log를 역순으로 재생해 원래 상태로 되돌린다.
- **PostgreSQL**: 트랜잭션이 본 데이터의 버전 (MVCC, Multi-Version Concurrency Control)을 별도로 두고, 커밋되지 않은 변경은 *애초에 다른 트랜잭션에서 보이지 않는다*. 롤백은 그 버전을 단순히 버리는 것이다.
- **Oracle**: undo tablespace에 이전 값을 보관하고 같은 방식으로 되돌린다.

DB 종류는 달라도 공통점은 분명하다. **"무엇을 어떻게 되돌릴지"는 DB의 책임이다.** Spring 코드 어디에도 "내가 보낸 SQL 목록"이라는 자료구조는 없다. 있어야 할 이유가 없다.

이걸 한번 잡고 나니 Spring 트랜잭션 코드를 보는 시선이 단순해진다. Spring이 결정하는 건 *시점*뿐이다.

- 언제 `setAutoCommit(false)`를 호출할지
- 언제 `commit()`을 호출할지
- 언제 `rollback()`을 호출할지

이 세 결정이 `@Transactional`이 하는 일의 전부다. *어떻게* 되돌리는지는 신경 쓰지 않는다. 그건 JDBC 드라이버 너머 DB 엔진의 영역이다.

### 함정, self-invocation

이 그림에 가장 자주 걸리는 함정이 self-invocation이다. 우테코 미션을 정리하면서 직접 실험으로 재현했다.

한 클래스 안에 `outer()`와 `inner()` 두 트랜잭션 메서드가 있고, `outer()`가 `this.inner()`를 부른다. `inner()`에는 `Propagation.REQUIRES_NEW`를 걸어 두면 새 트랜잭션이 시작되어야 정상이다.

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

`inner`의 transaction name이 `inner`가 아니라 `outer`다. 같은 트랜잭션이 그대로 흘러간 셈. `REQUIRES_NEW`가 무시됐다. 왜 무시되는지는 공식 문서가 한 줄로 답해준다.

> In proxy mode (which is the default), only external method calls coming in through the proxy are intercepted. This means that self-invocation (in effect, a method within the target object calling another method of the target object) does not lead to an actual transaction at runtime even if the invoked method is marked with `@Transactional`.

핵심 구절을 두 토막으로 끊으면 이렇다.

1. *only external method calls coming in through the proxy are intercepted* (프록시를 거쳐 들어오는 외부 호출만 가로채진다)
2. *self-invocation ... does not lead to an actual transaction at runtime even if the invoked method is marked with @Transactional* (대상 객체 내부에서 자기 자신의 다른 메서드를 호출하는 self-invocation은 그 메서드에 @Transactional이 붙어 있어도 실제 트랜잭션을 일으키지 않는다)

이게 왜 그런지는 위의 *프록시와 원본은 별개 객체*라는 사실에서 자연스럽게 따라 나온다. AOP Proxying Mechanisms 페이지의 설명이 자세하다.

> However, once the call has finally reached the target object (the `SimplePojo` reference in this case), any method calls that it may make on itself, such as `this.bar()` or `this.foo()`, are going to be invoked against the `this` reference, and not the proxy. This has important implications. It means that self invocation is not going to result in the advice associated with a method invocation getting a chance to run. In other words, self invocation via an explicit or implicit `this` reference will bypass the advice.

흐름을 그림으로 정리하면.

```
Caller ──> Proxy ──> Target (this)
                       │
                       └─ this.bar()  // 프록시 우회. Target 안에서 바로 호출.
```

Caller가 부른 첫 메서드는 프록시가 잡는다. 그 프록시가 트랜잭션을 시작하고, 본체 객체 (target)의 메서드를 호출한다. 거기까지는 정상. 그런데 본체 안에서 또 다른 메서드를 부를 때 쓰는 `this`는 프록시가 아니라 본체 자기 자신이다. 프록시를 거칠 일이 없으니 트랜잭션 어드바이스가 끼어들 자리도 없다.

힙에 있는 두 객체 (프록시, target)는 *완전히 다른 인스턴스*다. 컨테이너에 들어 있는 건 전자, target 안에서 `this`가 가리키는 건 후자. 두 객체는 부모-자식 관계도 아니고, target은 자신을 감싼 프록시의 존재 자체를 모른다. self-invocation이 안 먹는 건 마법이 아니라 자바 객체 참조의 평범한 규칙이다.

### 우회 방법 세 가지

프록시를 명시적으로 거치게 만들면 self-invocation 문제는 사라진다. 같은 클래스에 두 가지 방식을 추가해서 비교 실험을 돌렸다.

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

### @Lazy가 왜 필요한가

처음에는 `@Lazy` 없이 그냥 `@Autowired private SelfInvocationDemo self;`로 자기 자신을 주입하려고 했다. 그러자 ApplicationContext 로드 단계에서 실패했다.

```
java.lang.IllegalStateException: Failed to load ApplicationContext
Caused by: org.springframework.beans.factory.UnsatisfiedDependencyException:
  Error creating bean with name 'demo': Unsatisfied dependency expressed through field 'self':
  Error creating bean with name 'demo': Requested bean is currently in creation:
  Is there an unresolvable circular reference or an asynchronous initialization dependency?
```

Spring Boot 2.6부터 `spring.main.allow-circular-references`의 기본값이 `false`로 바뀌어서, 자기 자신을 주입하는 것조차 순환 참조로 보고 거부한다. `@Lazy`를 붙이면 의존성을 프록시로 감싸 늦게 해결해 주므로 컨테이너 구성 시점에는 순환 참조가 발생하지 않는다. 실제 메서드를 부르는 순간에야 프록시가 실체를 찾아온다. self-injection의 표준 해법이 반드시 `@Lazy`와 짝인 이유가 여기 있다.

### 또 하나의 해법, AspectJ 모드

공식 문서는 세 번째 해법을 따로 짚는다.

> Consider using AspectJ mode (see the `mode` attribute in the following table) if you expect self-invocations to be wrapped with transactions as well. In this case, there is no proxy in the first place. Instead, the target class is woven (that is, its byte code is modified) to support `@Transactional` runtime behavior on any kind of method.

AspectJ 모드는 프록시를 아예 쓰지 않고 클래스 바이트코드 자체를 변경 (weaving)한다. 그러면 `this.method()` 호출도 메서드 진입 시점에 트랜잭션 어드바이스가 끼어드는 형태로 바뀌어서 self-invocation 문제 자체가 사라진다. 일반 프로젝트에서는 빌드 설정 비용이 커서 거의 쓰이지 않고, 왜 self-invocation 우회가 *프록시 모델 자체의 한계*인지를 이해하는 보조 자료로만 쓰면 된다.

### 학습 테스트 셋업 함정

부록 한 가지. self-invocation 테스트를 처음 짤 때 다음과 같이 시작했다.

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

### 정리, 일곱 가지 단편

- 컨테이너에 들어가 있는 건 `ThemeService`가 아니라 `ThemeService$$SpringCGLIB$$0`이다. `getBean()`으로 직접 찍어볼 수 있다.
- 프록시와 원본은 힙에서 *다른 객체*다. 원본은 프록시의 `target` 필드로 보관될 뿐이고, target은 자신을 감싼 프록시의 존재 자체를 모른다.
- 가로챈 호출은 `TransactionInterceptor.invoke`로 들어가 `TransactionAspectSupport.invokeWithinTransaction`이 around-advice 본체를 실행한다.
- `PlatformTransactionManager`는 메서드가 셋뿐이다. `getTransaction`, `commit`, `rollback`. Spring 1.0보다 앞서 2003-05-16에 자리잡았다.
- 이 셋의 본체는 JDBC `Connection`의 `setAutoCommit(false)`, `commit()`, `rollback()` 호출이다. Spring은 *시점*만 결정한다.
- **롤백은 Spring이 SQL을 기억하는 게 아니라, DB가 자신의 undo log/MVCC로 처리한다.** Spring 입장에서 rollback은 메서드 호출 한 줄이다.
- self-invocation이 안 먹는 건 마법이 아니라 자바 객체 참조의 평범한 규칙이다. target 안의 `this`는 프록시가 아니라 자기 자신이다.

### 다음에 또 헷갈리면 적용할 룰

`@Transactional`이 박힌 클래스를 만질 때 두 질문을 먼저 던진다.

1. 이 호출은 프록시를 거치는가 (외부에서 들어오나, `this.`에서 출발하나)
2. 이 트랜잭션은 새로 시작되는가, 누군가에 참여하는가 (`Propagation`이 무엇인가)

전자가 "거치지 않는다"면 트랜잭션은 *없다*. 후자가 "참여한다"면 rollback-only 마킹은 그 자리에서 일어나도 실제 종료는 가장 바깥이 한다. 두 질문이 명확해지면 디버깅할 자리가 좁아진다.

AOP가 적용된 빈인지 확인하고 싶으면 `service.getClass().getName()`을 찍는다. `$$SpringCGLIB`나 `$Proxy`가 붙어 있으면 프록시가 들어 있는 것. 빈 자체가 프록시가 아니면 `@Transactional`을 아무리 붙여도 동작하지 않는다.

DB가 어떻게 되돌리는지 (undo log, MVCC)는 Spring을 쓰는 쪽에서 의식할 필요가 없다. 그건 DB의 책임이라는 사실 한 줄만 기억해두면 충분하다.
