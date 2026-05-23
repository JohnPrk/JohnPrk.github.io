---
title: "@ControllerAdvice라는 이름 때문에 AOP인 줄 알았다, 프록시까지 따라가본 후"
category: "spring"
slug: "spring-aop-proxy"
num: 5
date: 2026-05-16
description: "@RestControllerAdvice를 정리하다가 이름의 \"advice\" 부분이 걸렸다. 이게 AOP인가, 아니면 이름만 같은 다른 것인가. 답을 잡으려고 Spring AOP의 프록시 동작까지 거슬러 따라간 정리. @Transactional이 실제로 어떻게 메서드 호출을 가로채는지, JDK Dynamic Proxy와 CGLIB이 어떻게 다른지, self-invocation이 왜 안 먹는지, 그리고 @ControllerAdvice는 왜 프록시 AOP가 아닌지를 한 호흡으로 푼다."
tags: ["스프링", "AOP", "프록시", "@Transactional", "@ControllerAdvice"]
---

### 시작점, 이름 하나가 헷갈렸다

[직전 글](/spring/restcontrolleradvice-internals)에서 `@ControllerAdvice`를 정리하다가 한 단어가 걸렸다. 어노테이션 이름의 *advice* 부분이다.

AOP를 처음 배울 때 "advice는 횡단 관심사가 끼어드는 코드"라고 외운 기억이 있다. 그렇다면 `@ControllerAdvice`는 AOP 어노테이션인가? `@Transactional`이 프록시로 동작하는 것처럼 `@ControllerAdvice`도 컨트롤러를 프록시로 감싸는 것인가?

답을 잡으려면 Spring AOP가 *실제로 어떻게 동작하는지*까지 거슬러 따라가야 했다. 정리하고 나니 두 가지가 같은 정신을 따르지만 *완전히 다른 메커니즘*임이 보였다.

### 발견, AOP가 풀려고 했던 자리

객체지향 프로그래밍은 *수직적 분해*에 강하다. 도메인을 클래스 계층으로 나누고, 책임을 메서드로 분리한다. 그런데 어떤 관심사들은 *수평으로 흐른다*. 클래스 계층과 직교한다.

- 로깅, 모든 메서드 진입과 종료에 찍고 싶음
- 트랜잭션, 모든 서비스 메서드를 begin/commit으로 감싸고 싶음
- 보안, 모든 컨트롤러 메서드 진입 전에 권한 체크하고 싶음
- 예외 처리, 모든 컨트롤러에서 던지는 예외를 한 곳에서 잡고 싶음

이걸 OOP만으로 풀면 모든 메서드에 try-catch를 박거나, 상속 트리에 끼워 넣어야 한다. 두 방법 다 어색하다. 횡으로 흐르는 관심사가 종인 클래스 계층과 어긋나기 때문이다.

AOP(Aspect-Oriented Programming, 관점 지향 프로그래밍)는 이런 *횡단 관심사(cross-cutting concern)*를 따로 모으는 패러다임이다. 핵심 용어 다섯 개를 트랜잭션 예시로 정리하면 이렇다.

| 용어 | 의미 | 트랜잭션 예시 |
|---|---|---|
| Aspect | 횡단 관심사 모듈 | `TransactionInterceptor` 클래스 |
| Joinpoint | aspect를 끼울 수 있는 지점 | 메서드 호출 |
| Pointcut | 어떤 joinpoint에 적용할지 선택 규칙 | `@Transactional` 붙은 모든 메서드 |
| Advice | 해당 지점에서 실행되는 코드 | begin/commit/rollback 로직 |
| Weaving | aspect를 대상 코드와 엮는 과정 | 빈 생성 시 프록시로 감쌈 |

Advice의 종류는 다섯 가지. Before, After, AfterReturning, AfterThrowing, Around. `@Transactional`은 가장 강력한 Around에 해당한다.

### 원리, Spring AOP는 프록시 기반이다

Spring 공식 문서는 Spring AOP의 구현 방식을 이렇게 소개한다.

> Spring AOP is implemented in pure Java. There is no need for a special compilation process. Spring AOP currently supports only method execution joinpoints (advising the execution of methods on Spring beans). Spring AOP uses either JDK dynamic proxies or CGLIB to create the proxy for a given target object.

핵심은 *프록시*다. 원본 빈을 감싸는 *대리인 객체*를 만들고, 모든 메서드 호출을 가로채 Advice를 실행한 뒤 원본을 호출한다.

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

인터페이스가 *없으면* 못 만든다.

**CGLIB Proxy.** 클래스를 상속해 동적으로 새 클래스를 생성한다.

```java
@Service
public class UserService {   // 인터페이스 없음
    public void save(User u) { ... }
}

// 런타임에 Spring이 만드는 것 (개념)
class UserService$$EnhancerByCGLIB extends UserService {
    @Override
    public void save(User u) {
        // Advice 실행
        super.save(u);
    }
}
```

바이트코드 조작으로 *상속한 새 클래스*를 동적 생성한다. 단 `final` 클래스나 `final` 메서드는 못 막는다는 한계가 있다.

Spring Boot 2.0부터는 *기본이 CGLIB*다. 인터페이스 유무와 무관하게 일관되게 동작하기 위해서다. `application.properties`에서 `spring.aop.proxy-target-class=true`가 기본값.

### 프록시는 언제 만들어지는가

빈 생명주기 안에서 *후처리 단계*에 끼어든다.

```
1. 빈 정의 스캔
2. 빈 인스턴스 생성 (원본 객체)
3. BeanPostProcessor 체인 실행
   AnnotationAwareAspectJAutoProxyCreator가 마지막에 끼어들어:
     a) 이 빈이 advice 대상인지 검사 (Pointcut 매칭)
     b) 대상이면 원본을 감싸는 프록시 생성
     c) 컨테이너에 *프록시*를 등록 (원본은 프록시 내부에만 보관)
4. DI 시 프록시를 주입
```

`@Autowired UserService service`로 받은 객체가 사실 *프록시*다. `service.getClass().getName()`을 찍어보면 `UserService$$EnhancerByCGLIB$$abc123` 같은 이름이 나온다.

### 메서드 호출 시 실제 흐름

`@Transactional`이 붙은 메서드를 호출하면 이런 일이 일어난다.

```
caller가 service.save(user) 호출
  ↓
프록시.save(user)가 호출 가로챔
  ↓
TransactionInterceptor.invoke()가 실행:
  1. PlatformTransactionManager.getTransaction()으로 트랜잭션 시작
  2. try {
  3.     원본.save(user) 호출 (실제 비즈니스 로직)
  4.     commit
  5. } catch (Exception e) {
  6.     rollback
  7.     throw
  8. }
  ↓
caller에게 결과 반환
```

`@Transactional`이 마법처럼 보이지만, 실제로는 *프록시가 원본 호출을 try-catch로 감싸고 있는 것*이다.

### 가장 유명한 함정, self-invocation

```java
@Service
public class ReservationService {

    public void outer() {
        inner();   // ← this.inner(). 프록시 안 거침
    }

    @Transactional
    public void inner() { ... }   // ← 트랜잭션 안 걸림
}
```

`outer()`가 이미 *원본 객체 내부*에서 실행 중이라 `this`는 원본 인스턴스다. 프록시를 거치지 않고 원본 메서드를 직접 호출하므로 `TransactionInterceptor`가 끼어들 틈이 없다.

해결책 세 가지.

1. 자기 자신을 빈으로 주입해 호출
   ```java
   @Autowired ReservationService self;
   self.inner();
   ```
2. `AopContext.currentProxy()` 사용 (`@EnableAspectJAutoProxy(exposeProxy = true)` 필요)
3. 메서드를 다른 빈으로 분리

가장 깔끔한 건 3번이다. self-invocation이 필요한 상황은 보통 *책임 분리가 덜 된 신호*다.

### Spring AOP의 한계

- *Spring 빈에만* 적용된다. `new`로 만든 객체는 적용 안 됨
- *public 메서드만*. private/protected는 프록시가 가로채지 못함
- *self-invocation 안 됨* (위 참조)
- 메서드 호출마다 인터셉터 체인과 리플렉션 호출 오버헤드

더 강력한 게 필요하면 *AspectJ*가 있다. 컴파일 타임 또는 로드 타임에 바이트코드를 직접 수정해서 self-invocation도 잡고 private 메서드도 잡는다. Spring에서도 `@EnableLoadTimeWeaving`으로 통합 가능하다. 다만 설정 복잡성이 올라가서 실무에서는 Spring AOP로 충분한 경우가 대부분이다.

### 결론, @ControllerAdvice는 프록시 AOP가 아니다

이 글의 시작점 질문으로 돌아왔다. `@ControllerAdvice`는 AOP인가?

답은 *AOP 정신은 따르지만 Spring AOP 프록시는 아니다*.

```
@Transactional:
  컨트롤러/서비스 호출
    → 프록시가 가로챔
    → Advice 실행 (begin/commit/rollback)
    → 원본 호출

@ControllerAdvice:
  컨트롤러 메서드 호출 (정상 실행)
    → 예외 throw
    → DispatcherServlet이 catch
    → HandlerExceptionResolver 체인이 별도 경로로 @ExceptionHandler 호출
```

같은 *AOP 정신*(횡단 관심사 분리)을 따르지만, *구현 기법*은 다르다.

- `@Transactional`, 빈 후처리기가 만든 프록시가 인터셉트
- `@ControllerAdvice`, DispatcherServlet이 예외 시점에 별도로 호출

면접 자리나 블로그에서 "어드바이스니까 AOP겠지"로 묶어 답하면 깊이가 안 보인다. **"AOP 정신은 같지만 Spring AOP 프록시는 아니다"**가 정확한 답이다. `@ControllerAdvice`의 동작 메커니즘은 그래서 별도 글로 한 편 더 정리할 예정이다.

### 다음에 같은 자리에서 쓸 룰

- 어떤 어노테이션이 "advice"라는 단어를 쓴다고 해서 모두 같은 메커니즘이 아니다. `@Transactional`과 `@ControllerAdvice`는 *정신*만 같고 *구현*은 다르다.
- `@Transactional`이 안 먹는 것 같으면 가장 먼저 *self-invocation*을 의심한다. 같은 빈 내부에서 `this.method()`로 호출했는지 본다.
- AOP가 적용된 빈인지 확인하고 싶으면 `service.getClass().getName()`을 찍는다. `$$EnhancerByCGLIB`나 `$Proxy`가 붙어 있으면 프록시다.
- Spring AOP는 *public 메서드 + Spring 빈*에서만 동작한다. 둘 중 하나라도 어긋나면 advice가 안 먹는다.
