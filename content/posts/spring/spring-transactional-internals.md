---
title: "@Transactional 한 줄을 따라가다 만난 프록시, ThreadLocal, 그리고 롤백의 책임 소재"
category: "spring"
slug: "spring-transactional-internals"
num: 10
date: 2026-05-18
description: "우테코 룸이스케이프 미션에서 서비스에 @Transactional을 막 적용한 직후, 컨테이너 빈을 꺼냈더니 $SpringCGLIB$0이 붙어 있었다. 거기서부터 AOP가 푸는 자리, 프록시의 정체, TransactionInterceptor와 PlatformTransactionManager의 JavaDoc, ThreadLocal이 한 트랜잭션을 묶는 방식, PROPAGATION의 규칙, self-invocation이 깨지는 자리, 그리고 가장 큰 오해 한 가지가 풀렸다. Spring은 내 쿼리를 기억하지 않는다. 롤백은 DB의 책임이고 Spring은 시점만 결정한다."
tags: ["스프링", "@Transactional", "AOP", "프록시", "TransactionInterceptor", "PlatformTransactionManager", "ThreadLocal", "Propagation", "트랜잭션", "우테코"]
---

### 시작점, 한 줄짜리 PR 리뷰에서 출발한 정리

우테코 룸이스케이프 admin 미션에서 DB를 붙인 직후, PR 리뷰 한 줄이 들어왔다.

> p2: DB를 적용했는데 트랜잭션 경계가 없네요! spring에서 트랜잭션을 어떻게 구현하는지 학습해보고 적용해보시죠~(숙제📚)

서비스 메서드에 `@Transactional`을 붙이는 건 익숙했는데, 정작 *이 한 줄이 정확히 무엇을 만들어 내는가*는 몰랐다. 적용 자체는 한 줄이다.

```java
@Service
public class ThemeService {

    @Transactional
    public Theme save(...) { ... }
}
```

평소 머릿속 그림은 단순했다. `@Service`를 붙이면 컴포넌트 스캔이 클래스를 찾아 빈으로 등록한다. 그 빈을 컨테이너에서 꺼내 쓰면 *내가 작성한 그 클래스의 인스턴스*가 나온다. 이 정도가 끝이었다.

그런데 어디선가 *Spring AOP는 프록시 기반*이라는 말을 들었다. 트랜잭션도 AOP로 처리된다는 설명. *프록시*라는 단어가 익숙치 않아서 직접 확인해보기로 했다.

```java
ConfigurableApplicationContext run = SpringApplication.run(Application.class, args);
System.out.println(run.getBean("themeService").getClass());
```

출력.

```
class roomescape.service.ThemeService$$SpringCGLIB$$0
```

내가 짠 클래스는 `roomescape.service.ThemeService`다. 그런데 컨테이너에서 꺼내보니 같은 이름 뒤에 `$$SpringCGLIB$$0`이 붙어 있다. 이름이 다르면 클래스가 다르고, 클래스가 다르면 객체가 다르다. 컴포넌트 스캔으로 빈이 등록되긴 했는데, 들어 있는 건 *내 ThemeService 그 자체가 아니라* 그것을 상속해 만든 다른 클래스였다. 다시 말해 *프록시*다.

이 한 줄짜리 출력이 글의 출발점이다. 따라간 질문은 여섯이었다.

1. AOP가 정확히 무엇을 풀려고 만들어졌는가, 왜 그게 Spring의 *3대 축* 중 하나로까지 불리는가
2. 컨테이너가 진짜 객체 대신 *프록시*를 넣어두는 이유와 그 프록시 클래스의 정체
3. 가로챈 호출은 누구에게 넘어가는가 (`TransactionInterceptor`)
4. 그 누군가는 무엇을 부르는가 (`PlatformTransactionManager`)
5. 같은 트랜잭션 안의 여러 SQL이 어떻게 같은 Connection을 쓰는가 (ThreadLocal)
6. 롤백할 때 Spring이 내 SQL을 기억해서 반대로 돌리는가

마지막이 가장 헷갈렸다. update 한 줄, insert 두 줄, delete 한 줄이 섞여 있는 트랜잭션을 롤백할 때, 누군가는 그 네 줄을 모두 기억하고 있다가 반대로 실행해야 할 텐데, 그 주체가 Spring인가 DB인가가 잘 그려지지 않았다.

답을 잡으려고 공식 문서까지 거슬러 올라갔다.

### AOP가 풀려고 했던 자리, Spring의 3대 축이라는 표현

토비의 스프링이 자주 쓰는 표현이 있다. *Spring의 3대 축은 IoC/DI, AOP, PSA*. PSA는 Portable Service Abstraction의 약자로, JDBC든 JPA든 JMS든 같은 인터페이스로 다룰 수 있게 추상화한 층을 가리킨다. IoC/DI는 객체 생성과 의존관계 해결을 컨테이너에 맡기는 원칙. 그리고 AOP는 *클래스 계층과 직교하는 관심사*를 따로 분리하는 원칙이다.

`@Transactional`은 정확히 이 세 축 위에 동시에 올라타 있다. `PlatformTransactionManager`라는 추상화가 PSA, 그 매니저를 빈으로 등록해 두는 게 IoC/DI, 그 매니저를 *모든 트랜잭션 메서드 앞뒤에 자동으로 끼우는* 메커니즘이 AOP다. 세 축 중 하나가 빠지면 `@Transactional`은 성립하지 않는다.

그런데 AOP가 처음 와닿지 않았던 이유는, *Around advice가 메서드 앞뒤로 무언가를 끼우는 것*만 보면 그냥 데코레이터 패턴이나 try-catch 블록과 다를 게 없어 보였기 때문이다. 메서드 앞뒤로 코드 넣는 일이라면 자바 기본 문법으로도 충분히 할 수 있다. 그게 왜 *Aspect-Oriented Programming*이라는 거창한 이름까지 받았는가.

답은 *어디에 적용할지를 코드와 분리해서 선언적으로 정한다*는 데 있다. 다음 두 가지를 비교하면 차이가 분명해진다.

**OOP만으로 트랜잭션을 풀면.**

```java
public Theme save(...) {
    Connection conn = dataSource.getConnection();
    conn.setAutoCommit(false);
    try {
        Theme theme = doSave(...);   // 실제 저장 로직
        conn.commit();
        return theme;
    } catch (RuntimeException e) {
        conn.rollback();
        throw e;
    } finally {
        conn.close();
    }
}
```

비즈니스 로직(`doSave`) 한 줄을 부르기 위해 트랜잭션 처리용 곁다리 코드가 그 위아래로 8줄. 게다가 *모든 서비스 메서드*가 똑같은 반복 코드를 떠안아야 한다. 비즈니스 코드와 트랜잭션 코드가 코드 상에서 *섞여 있다.*

**AOP를 쓰면.**

```java
@Transactional
public Theme save(...) {
    return doSave(...);
}
```

`doSave` 호출 한 줄뿐. 트랜잭션 처리 코드는 *완전히 사라졌다.* `@Transactional`이라는 마커만 남고, 그 마커가 붙은 모든 메서드에 같은 트랜잭션 처리가 자동으로 끼워진다. 비즈니스 코드는 트랜잭션이 있다는 사실을 모르고, 트랜잭션 코드는 그 비즈니스 로직이 무엇인지 모른다. 두 관심사가 *코드 상에서 분리*되어 있다는 점이 AOP의 본질이다.

핵심 용어 다섯 개를 트랜잭션 예시로 정리하면 이렇다.

| 용어 | 의미 | 트랜잭션 예시 |
|---|---|---|
| Aspect | 횡단 관심사 모듈 | `TransactionInterceptor` 클래스 |
| Joinpoint | aspect를 끼울 수 있는 지점 | 메서드 호출 |
| Pointcut | 어떤 joinpoint에 적용할지 선택 규칙 | `@Transactional` 붙은 모든 메서드 |
| Advice | 해당 지점에서 실행되는 코드 | begin/commit/rollback 로직 |
| Weaving | aspect를 대상 코드와 엮는 과정 | 빈 생성 시 프록시로 감쌈 |

핵심은 **Pointcut**이다. "메서드 앞뒤에 끼운다"는 행위 자체는 OOP로도 가능하지만, "*어떤 메서드들에 끼울지*를 선언적으로 묶어두는 능력"은 AOP의 고유 기능이다. `@Transactional` 어노테이션은 곧 Pointcut 정의 그 자체다. *이 어노테이션이 붙은 메서드*가 곧 트랜잭션 advice의 적용 대상 집합이다.

Advice의 종류는 다섯 가지가 있다. Before, After, AfterReturning, AfterThrowing, Around. `@Transactional`은 가장 강력한 Around에 해당한다. 메서드 실행 *전과 후* 양쪽에 끼어들 수 있고, 예외 처리까지 둘러쌀 수 있다. 트랜잭션은 begin도 끼우고 commit/rollback도 끼워야 하므로 Around 외 다른 advice 타입으로는 표현이 안 된다.

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

여기서 두 가지 의문이 있었다. 첫째, `UserService$$SpringCGLIB$$0`은 *내부 클래스*인가? 결론은 아니다. 위 코드 블록은 "개념적으로 이런 모양"이라는 의사 코드일 뿐, 실제로는 CGLIB가 *별도의 새 클래스 파일*을 런타임에 바이트코드로 만들어 클래스로더에 올린다. 같은 패키지에 따로 정의되는 *외부 클래스*이고, 단지 컴파일 시점이 아닌 *런타임 시점*에 생성될 뿐이다. 클래스 이름의 `$$`는 자바 소스에서는 등장하기 어려운 문자라 충돌을 피하기 위해 CGLIB이 관례적으로 쓰는 구분자다.

둘째, 그러면 *protected*나 *default(package-private)* 메서드까지 오버라이드할 수 있는가? `public` 메서드는 명확히 오버라이드 가능. `protected`도 같은 패키지/서브클래스 규칙으로 가능. `default`는 *같은 패키지에 한해서만* 오버라이드 가능. 그래서 CGLIB은 일반적으로 원본과 *같은 패키지*에 프록시 클래스를 생성한다. `private` 메서드와 `final` 메서드는 자바 언어 차원에서 오버라이드가 불가능하므로 CGLIB로도 가로챌 수 없다. AOP가 안 먹는 자주 만나는 케이스의 절반이 여기서 나온다.

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

롤백도 같은 원리다. *내가 시작한 트랜잭션이 아니면 진짜 롤백을 하지 않고 rollback-only 플래그만 켜둔다.* 안쪽 메서드는 "이 트랜잭션은 망했다"는 표시만 남기고 자기 호출을 끝낸다. 실제 `conn.rollback()`은 바깥 메서드가 종료될 때 호출된다. *트랜잭션의 진짜 시작과 끝은 가장 바깥쪽 호출만 결정한다.*

`PlatformTransactionManager`의 구현체는 자원 종류에 따라 다르다. JDBC를 직접 쓰면 `DataSourceTransactionManager`, JPA를 쓰면 `JpaTransactionManager`, 분산 트랜잭션이면 `JtaTransactionManager`. 인터페이스는 같고 구현만 갈아끼우면 되니까, 서비스 코드는 자원 종류와 무관하게 같은 모양을 유지한다. 이게 PSA (Portable Service Abstraction)가 작동하는 자리다.

### ThreadLocal, 같은 트랜잭션을 묶는 끈

여기까지 따라오다가 한 가지 의문이 생겼다. *트랜잭션 매니저가 시작한 Connection을 어떻게 비즈니스 코드 안의 JdbcTemplate이 같은 Connection으로 받을까?* 비즈니스 코드에서는 `dataSource.getConnection()`만 부를 텐데, 그게 어떻게 매니저가 들고 있는 그 Connection으로 연결될까?

답은 **ThreadLocal**에 있다.

ThreadLocal은 *스레드 단위의 저장소*다. 일반 변수처럼 보이지만 값은 *각 스레드별로 독립*이다. A 스레드가 ThreadLocal에 `X`를 넣으면 A 스레드에서만 `X`가 보이고, B 스레드는 같은 ThreadLocal을 읽어도 `null`이 나온다.

```java
private static final ThreadLocal<String> currentUser = new ThreadLocal<>();

// 스레드 A
currentUser.set("alice");
currentUser.get();   // "alice"

// 스레드 B (같은 currentUser ThreadLocal)
currentUser.get();   // null. A가 넣은 값이 B에서는 안 보임
```

이게 트랜잭션과 무슨 관계인가. 웹 서버는 보통 *요청 한 건당 한 스레드*가 처리한다. 그 스레드가 컨트롤러 → 서비스 → DAO → JDBC로 흘러간다. 그 흐름 전체에서 *같은 Connection*을 써야 같은 트랜잭션 안에 묶인다.

Spring은 이를 위해 `TransactionSynchronizationManager`라는 클래스를 둔다. 내부적으로 ThreadLocal을 여러 개 가지고 있고, 그중 하나가 *현재 스레드에 바인딩된 Connection*을 보관한다.

흐름은 이렇다.

```
1. TransactionInterceptor가 트랜잭션 시작 결정
2. DataSourceTransactionManager.doBegin()
     - DataSource에서 Connection 한 개 꺼냄
     - conn.setAutoCommit(false)
     - TransactionSynchronizationManager에 Connection 바인딩 (ThreadLocal에 set)

3. 비즈니스 메서드 실행
     - JdbcTemplate.update(...)
         - 내부적으로 DataSourceUtils.getConnection(dataSource) 호출
         - 이 메서드가 먼저 TransactionSynchronizationManager를 확인
         - ThreadLocal에 Connection이 바인딩돼 있으면 그것을 재사용
         - 없으면 DataSource에서 새로 꺼냄

4. 트랜잭션 종료
     - conn.commit() 또는 conn.rollback()
     - TransactionSynchronizationManager에서 Connection 언바인딩 (ThreadLocal clear)
     - Connection을 풀에 반환
```

핵심은 3단계의 `DataSourceUtils.getConnection`이다. `dataSource.getConnection()`을 *직접* 부르면 매번 새 Connection이 나와서 각각 다른 트랜잭션이 된다. JdbcTemplate은 그렇게 부르지 않는다. `DataSourceUtils.getConnection`을 통해 *ThreadLocal에 이미 묶여 있는지부터 확인*한다. 그래서 같은 요청 처리 스레드 안의 모든 SQL은 자동으로 같은 Connection으로 흘러간다.

ThreadLocal이 없으면 트랜잭션 매니저가 시작한 Connection을 비즈니스 코드 깊은 곳까지 *인자로 전달*해야 한다. 그 전달이 코드 곳곳에 박혀 있던 게 Spring 이전 JDBC 코드의 못생긴 부분이었다. Spring은 ThreadLocal로 그 인자를 *지웠다.*

다만 이 모델에는 분명한 전제가 있다. **한 트랜잭션은 한 스레드 안에서만 살아 있어야 한다.** 트랜잭션 중간에 다른 스레드로 작업을 넘기면 ThreadLocal에 묶인 Connection이 따라가지 않는다. `@Async` 메서드를 트랜잭션 안에서 부르거나 `CompletableFuture`로 작업을 던질 때 트랜잭션이 깨지는 사고가 여기서 자주 난다.

### PROPAGATION, 트랜잭션이 만나면 어떻게 할 것인가

`@Transactional`을 붙인 서비스 메서드가 또 다른 `@Transactional` 서비스 메서드를 호출하는 일은 흔하다. *바깥 메서드*도 트랜잭션, *안쪽 메서드*도 트랜잭션일 때 두 트랜잭션은 어떻게 처리되어야 할까. 한 트랜잭션으로 합쳐야 할까, 분리해야 할까, 안쪽은 트랜잭션이 없는 셈 쳐야 할까. 이 규칙을 **Propagation**이라 한다.

`@Transactional(propagation = ...)`로 지정하고, 기본값은 `REQUIRED`다. 종류는 일곱이다.

| Propagation | 바깥 트랜잭션이 *있을 때* | 바깥 트랜잭션이 *없을 때* |
|---|---|---|
| `REQUIRED` (기본) | 그 트랜잭션에 참여 | 새 트랜잭션 시작 |
| `REQUIRES_NEW` | 바깥을 일시 중단, 새 트랜잭션 시작 | 새 트랜잭션 시작 |
| `SUPPORTS` | 그 트랜잭션에 참여 | 트랜잭션 없이 실행 |
| `NOT_SUPPORTED` | 바깥을 일시 중단, 트랜잭션 없이 실행 | 트랜잭션 없이 실행 |
| `MANDATORY` | 그 트랜잭션에 참여 | 예외 발생 |
| `NEVER` | 예외 발생 | 트랜잭션 없이 실행 |
| `NESTED` | 중첩 (savepoint) | 새 트랜잭션 시작 |

실무에서 95%는 `REQUIRED`와 `REQUIRES_NEW` 두 가지다. 차이를 코드로 보면 이렇다.

```java
@Transactional   // 기본 REQUIRED
public void outer() {
    repo.save(...);
    inner();
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void inner() {
    repo.save(...);
    throw new RuntimeException();
}
```

`outer`가 `inner`를 호출한다고 가정하자. `inner`가 RuntimeException을 던지면.

- **만약 `inner`가 `REQUIRED`였다면**, 둘은 한 트랜잭션이다. 그 한 트랜잭션이 통째로 롤백된다. `outer`에서 했던 `repo.save`도 같이 사라진다.
- **`inner`가 `REQUIRES_NEW`라면**, 둘은 별개의 트랜잭션이다. `inner`만 롤백되고 `outer`에서 했던 작업은 남는다. 단, `outer`가 그 예외를 잡지 않으면 `outer`도 결국 롤백되긴 한다. 예외를 *try-catch로 잡아서 흡수*해야 `outer`의 작업이 살아남는다.

`REQUIRES_NEW`가 어울리는 자리는 *부수 작업을 본 작업과 분리하고 싶을 때*다. 결제 처리에서 본 거래는 실패해도 *감사 로그*는 남기고 싶다거나, 메일 발송 실패가 주문에 영향을 주면 안 되거나 하는 경우. 이 분리를 안전하게 해 주는 게 `REQUIRES_NEW`다.

`NESTED`는 JDBC savepoint를 사용한 *부분 롤백*인데 일반적인 사용에서는 거의 등장하지 않는다.

### 어떤 예외에서 롤백이 일어나나

기본 룰 한 줄. **RuntimeException과 Error만 롤백 대상이다.** 체크드 예외(`SQLException`, `IOException` 등)는 던져져도 자동 롤백이 *일어나지 않는다*.

```java
@Transactional
public void save() throws IOException {
    repo.insert(...);
    throw new IOException();   // 롤백 X. insert는 그대로 커밋된다.
}

@Transactional
public void save() {
    repo.insert(...);
    throw new RuntimeException();   // 롤백 O. insert도 같이 사라진다.
}
```

이 룰은 EJB 시절부터의 관례를 그대로 가져온 것이라 *왜* 그런지보다는 *그렇다*고 외우는 게 빠르다. 체크드 예외도 롤백 대상으로 만들고 싶으면 `@Transactional(rollbackFor = SomeCheckedException.class)`로 명시한다.

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
    │         이 Connection을 ThreadLocal(TransactionSynchronizationManager)에 바인딩
    │
    ├─ 2) try {
    │         target.save(req)   ← 진짜 ThemeService.save() 실행
    │                              안쪽의 JdbcTemplate은
    │                              DataSourceUtils.getConnection(dataSource)로
    │                              ThreadLocal에 묶여 있는 같은 Connection을 꺼내 씀
    │     } catch (ex) {
    │         완료 처리 (= commit 또는 rollback)
    │         throw ex
    │     }
    │
    ├─ 3a) 정상 종료: txManager.commit(status)
    │       └─ conn.commit()
    │       └─ ThreadLocal에서 Connection 언바인딩
    │       └─ 풀에 Connection 반환
    │
    └─ 3b) 예외 + 롤백 대상: txManager.rollback(status)
            └─ conn.rollback()
            └─ ThreadLocal에서 Connection 언바인딩
            └─ 풀에 Connection 반환
```

이 그림에서 가장 중요한 부분은 **Spring이 직접 SQL을 보내지 않는다**는 것이다. Spring은 Connection의 `setAutoCommit`, `commit`, `rollback` 같은 JDBC API를 시점에 맞춰 호출할 뿐이다. 이 사실이 글의 마지막 큰 발견과 직결된다.

### 가장 큰 오해, Spring은 내 쿼리를 기억하지 않는다

처음에 몰랐던 여섯 번째 질문의 답이 여기 있다. update 한 줄, insert 두 줄, delete 한 줄이 섞여 있을 때 Spring이 그 네 줄을 어딘가에 보관해 두었다가 반대로 돌리는 일은 *없다*. Spring의 `rollback`은 JDBC 표준 메서드 호출 한 줄이다.

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

같은 클래스 안에서 `this.다른메서드()`로 자기 자신의 트랜잭션 메서드를 부르면, 그 안쪽 트랜잭션은 *적용되지 않는다*. 우테코 미션을 정리하면서 직접 실험으로 재현했다.

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

`inner`의 transaction name이 `inner`가 아니라 `outer`다. 같은 트랜잭션이 그대로 흘러간 셈. `REQUIRES_NEW`가 무시됐다.

이 현상이 왜 일어나는지는 두 개의 질문으로 쪼개면 깔끔하다.

#### 질문 1. outer는 어떻게 트랜잭션이 걸렸나

외부에서 (예: 컨트롤러) `service.outer()`를 부른다. 그런데 컨테이너에서 받은 `service`는 *원본이 아니라 프록시*다. 그러니까 외부에서 들어온 호출은 **무조건 프록시의 outer()**에 먼저 도착한다.

프록시의 `outer()`가 하는 일은 두 가지. (1) advice를 끼운다 (= 트랜잭션을 시작한다). (2) 그러고 나서 *원본(target) 객체*의 `outer()`를 부른다.

```
Controller ──> Proxy.outer() ──> Target.outer()
                 │                   │
                 ├─ 트랜잭션 시작      └─ 진짜 비즈니스 로직 실행
                 └─ target.outer() 호출
```

여기서 핵심은 **컨테이너 바깥에서 들어오는 호출은 무조건 프록시를 거친다**는 것. 컨트롤러가 받은 빈은 프록시이고, 다른 서비스에서 `@Autowired`로 받은 빈도 프록시다. 자기 자신이 아닌 *바깥*에서 빈을 부르는 한 첫 호출 지점은 항상 프록시다. 그래서 outer는 트랜잭션이 걸린다.

#### 질문 2. inner는 왜 프록시를 거치지 않나

이제 target의 `outer()` 안에서 `this.inner()`를 부르는 순간을 보자. 자바에서 `this`는 *지금 이 코드가 실행되고 있는 객체 자신*을 가리킨다. 지금 실행 중인 객체는 Target이지 Proxy가 아니다. Proxy는 `target.outer()`를 호출한 뒤 호출 스택의 한 단계 위에 머물러 있을 뿐, 현재 실행 컨텍스트는 Target이다.

그러니까 `this.inner()`는 *Target.inner()*를 그대로 호출한다. Proxy를 거칠 일이 없다.

```
Target.outer() {
    this.inner();   // this = Target. Target.inner() 직행. Proxy 우회.
}
```

왜 Target은 자기 자신을 감싼 Proxy로 우회하지 못하는가. 답은 단순하다. **Target은 자신을 감싼 Proxy의 존재를 모른다.** Proxy는 생성될 때 Target을 자기 필드에 가져온다. 그 반대 방향(Target이 Proxy를 가리키는 참조)은 *존재하지 않는다*. 두 객체는 부모-자식 관계도 아니고, 상속은 *반대* 방향이다 (Proxy가 Target을 상속). Target 입장에서는 자기 자신만 보일 뿐, 자기 위에 무엇이 씌워져 있는지 모른다.

그래서 `this.inner()`로 가면 advice가 끼어들 자리가 사라지고, `@Transactional`도 `Propagation.REQUIRES_NEW`도 무시된다.

#### 공식 문서 두 줄로 확인

Spring 공식 문서가 같은 사실을 두 자리에서 말한다.

> In proxy mode (which is the default), only external method calls coming in through the proxy are intercepted. This means that self-invocation (in effect, a method within the target object calling another method of the target object) does not lead to an actual transaction at runtime even if the invoked method is marked with `@Transactional`.

번역하면. 프록시 모드에서는 *프록시를 거쳐 들어오는 외부 호출*만 가로채진다. target 내부에서 target 자신의 다른 메서드를 호출하는 self-invocation은 그 메서드에 `@Transactional`이 붙어 있어도 트랜잭션이 시작되지 않는다.

AOP Proxying Mechanisms 페이지가 같은 사실을 자바 객체 참조의 관점에서 다시 정리한다.

> However, once the call has finally reached the target object (the `SimplePojo` reference in this case), any method calls that it may make on itself, such as `this.bar()` or `this.foo()`, are going to be invoked against the `this` reference, and not the proxy. ... self invocation via an explicit or implicit `this` reference will bypass the advice.

`this`로 가는 호출은 advice를 우회한다고 명시한다.

#### 해법

결국 *프록시를 명시적으로 거치게 만드는 것*이 답이다. 자기 자신 빈을 주입받아 그걸로 호출하면 프록시를 거치고, 두 메서드를 *다른 클래스*로 분리하면 호출이 컨테이너의 다른 빈(= 다른 프록시)을 통해서 들어가므로 정상 동작한다. 분리 쪽이 보통 더 깔끔하다. 같은 클래스 안에서 굳이 자기 자신을 우회하는 코드는 추후에 읽을 때마다 *왜 이렇게 됐지?* 한 번 더 생각하게 만든다.

### 정리, 일곱 가지 단편

- `@Transactional`은 Spring의 3대 축(IoC/DI, AOP, PSA) 위에 동시에 올라타 있다. 한 축만 빠져도 성립하지 않는다.
- AOP의 본질은 *메서드 앞뒤에 코드를 끼우는 것*이 아니라 *어디에 끼울지를 코드와 분리해서 선언적으로 정하는 것*이다. `@Transactional`은 그 자체가 Pointcut 정의다.
- 컴포넌트 스캔으로 빈이 등록되지만 컨테이너에 들어가 있는 건 내 클래스가 아니라 `ThemeService$$SpringCGLIB$$0`이라는 *프록시*다. CGLIB이 런타임에 만든 *서브클래스*이고, `private`/`final` 메서드는 자바 차원에서 오버라이드가 안 되어 가로채지지 않는다.
- 프록시와 원본은 힙에서 *다른 객체*다. 원본은 프록시의 `target` 필드로 보관될 뿐이고, target은 자신을 감싼 프록시의 존재 자체를 모른다. self-invocation이 무력화되는 이유가 여기 있다.
- 한 트랜잭션을 묶는 끈은 ThreadLocal이다. `TransactionSynchronizationManager`가 Connection을 거기 묶고, JdbcTemplate은 `DataSourceUtils.getConnection`으로 그 묶인 Connection을 꺼내 쓴다.
- `PlatformTransactionManager`는 메서드가 셋뿐이다. `getTransaction`, `commit`, `rollback`. 본체는 JDBC `Connection`의 `setAutoCommit(false)`, `commit()`, `rollback()` 호출이다. Spring은 *시점*만 결정한다.
- **롤백은 Spring이 SQL을 기억하는 게 아니라, DB가 자신의 undo log/MVCC로 처리한다.** Spring 입장에서 rollback은 메서드 호출 한 줄이다.

### 다음에 또 헷갈리면 적용할 룰

`@Transactional`이 박힌 클래스를 만질 때 세 질문을 먼저 던진다.

1. 이 호출은 프록시를 거치는가 (외부에서 들어오나, `this.`에서 출발하나)
2. 이 트랜잭션은 새로 시작되는가, 누군가에 참여하는가 (`Propagation`이 무엇인가)
3. 이 작업은 *같은 스레드 안*에서 끝나는가 (`@Async`로 다른 스레드에 던지지 않는가)

(1)이 "거치지 않는다"면 트랜잭션은 *없다*. (2)가 "참여한다"면 rollback-only 마킹은 그 자리에서 일어나도 실제 종료는 가장 바깥이 한다. (3)이 "다른 스레드로 넘긴다"면 ThreadLocal이 따라가지 않아서 트랜잭션이 깨진다. 세 질문이 명확해지면 디버깅할 자리가 좁아진다.

AOP가 적용된 빈인지 확인하고 싶으면 `service.getClass().getName()`을 찍는다. `$$SpringCGLIB`나 `$Proxy`가 붙어 있으면 프록시가 들어 있는 것. 빈 자체가 프록시가 아니면 `@Transactional`을 아무리 붙여도 동작하지 않는다.

DB가 어떻게 되돌리는지 (undo log, MVCC)는 Spring을 쓰는 쪽에서 의식할 필요가 없다. 그건 DB의 책임이라는 사실 한 줄만 기억해두면 충분하다.
