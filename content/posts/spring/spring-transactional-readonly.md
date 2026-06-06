---
title: "readOnly가 쓰기를 막는 줄 알았다, H2 커넥션에서 힌트가 버려지는 걸 보고"
category: "spring"
slug: "spring-transactional-readonly"
num: 16
date: 2026-06-06
description: "우테코 룸이스케이프 미션에서 서비스에 @Transactional(readOnly = true)를 클래스 레벨로 깔아두고 있었다. 지난번 @Transactional 한 줄을 따라가며 프록시와 ThreadLocal, 롤백이 DB의 책임이라는 것까지 본 뒤였는데, readOnly 옵션 하나는 조회 전용이라는 막연한 이해로만 남아 있었다. 정말 select 말고 다른 쿼리를 막는지 TransactionTemplate으로 직접 찍어보니, isCurrentTransactionReadOnly는 true인데 Connection.isReadOnly는 false였고 readOnly 트랜잭션 안의 INSERT가 그대로 커밋됐다. 이 모순처럼 보이는 결과를 Spring 6.2.5와 H2 2.3.232 소스까지 따라가며 풀었다. readOnly는 강제가 아니라 ThreadLocal과 JDBC 커넥션, DB 엔진으로 흘려보내는 힌트였고, 종착지인 H2는 그 힌트를 'readOnly ignored'라는 주석과 함께 버리고 있었다."
tags: ["스프링", "@Transactional", "readOnly", "트랜잭션", "JDBC", "Hibernate", "H2", "PlatformTransactionManager", "우테코"]
---

### 시작점, 서비스에 readOnly를 깔아두고

우테코 룸이스케이프 미션의 서비스 클래스들은 이런 모양이었다.

```java
@Service
@Transactional(readOnly = true)
public class ReservationService {

    public List<Reservation> findAll(...) { ... }

    @Transactional
    public Reservation save(...) { ... }
}
```

클래스 레벨에 `@Transactional(readOnly = true)`를 깔고, 쓰기 메서드에만 `@Transactional`을 다시 붙여 덮는 패턴. 조회는 읽기 전용, 쓰기는 읽기 전용을 푸는 식이다. Spring Data JPA의 `SimpleJpaRepository`가 쓰는 관례를 그대로 가져온 것인데, 정작 *읽기 전용이라는 게 무엇을 한다는 건지*는 손에 잡히지 않았다.

지난 글에서 `@Transactional` 한 줄이 만드는 것을 따라간 적이 있다. 프록시가 빈 자리를 대신 채우고, ThreadLocal이 한 트랜잭션을 한 스레드로 묶고, 롤백은 Spring이 내 SQL을 기억하는 게 아니라 DB가 undo log로 처리한다는 것까지. 거기서 한 가지가 끝까지 막연하게 남아 있었다. `readOnly = true`다.

머릿속 그림은 "select만 허용하고 나머지를 막는 모드" 정도였다. 그런데 *막는다*는 말이 걸렸다. 막는다면 누가 막는가. 막히면 무슨 예외가 나는가. 그게 컴파일 시점에 잡히는가 런타임에 잡히는가. 따라간 질문은 넷이었다.

1. `readOnly` 힌트는 누가 받는가
2. select 말고 다른 쿼리를 *정말* 막는가
3. 막힌다면 무슨 예외가 나는가
4. 그건 런타임 검출인가, 컴파일 시점에도 잡히는가

### 직접 찍어본 세 값, 그리고 모순처럼 보인 결과

말로 따지기 전에 찍어보기로 했다. 내 환경은 JdbcTemplate과 H2 인메모리 DB다 (`jdbc:h2:mem:database`).

같은 클래스의 테스트 메서드에 `@Transactional(readOnly = true)`를 붙이면 프록시를 거치지 않아 트랜잭션이 시작되지 않는다. 지난 글의 self-invocation이 그 자리다. 그래서 `TransactionTemplate`으로 readOnly 트랜잭션을 *직접* 열고, 그 안에서 세 가지를 찍었다.

```java
@SpringBootTest
class ReadOnlyHintProbeTest {

    @Autowired PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired DataSource dataSource;

    @Test
    void readOnly_트랜잭션에서_INSERT가_차단되는지_측정한다() {
        System.out.println("TX MANAGER = " + transactionManager.getClass().getName());

        TransactionTemplate readOnlyTx = new TransactionTemplate(transactionManager);
        readOnlyTx.setReadOnly(true);

        Integer before = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM reservation_time", Integer.class);

        readOnlyTx.execute(status -> {
            // (1) 힌트가 트랜잭션 동기화 레벨까지 전달됐나
            System.out.println(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            // (2) Spring이 JDBC 커넥션에 setReadOnly(true)를 호출했나
            Connection con = DataSourceUtils.getConnection(dataSource);
            System.out.println(con.isReadOnly());
            // (3) readOnly 트랜잭션 안에서 INSERT를 시도하면
            jdbcTemplate.update("INSERT INTO reservation_time (start_at) VALUES ('23:59')");
            return null;
        });

        Integer after = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM reservation_time", Integer.class);
        System.out.println("before=" + before + " after=" + after);
    }
}
```

출력은 이랬다.

```
TX MANAGER = org.springframework.jdbc.support.JdbcTransactionManager
(1) isCurrentTransactionReadOnly = true
(2) JDBC Connection.isReadOnly = false
(3) INSERT 성공, H2가 막지 않음
(4) before=0 after=1
```

세 값이 한 화면에서 어긋나 보였다.

- (1) `isCurrentTransactionReadOnly`는 **true**다. Spring은 이 트랜잭션이 읽기 전용임을 분명히 알고 있다.
- (2) 그런데 `Connection.isReadOnly`는 **false**다. JDBC 커넥션 입장에서는 읽기 전용이 아니다.
- (3)(4) readOnly 트랜잭션 안에서 던진 INSERT가 예외 없이 성공했고, 행 개수가 0에서 1로 늘었다. 실제로 커밋됐다.

Spring은 읽기 전용이라고 말하는데, 커넥션은 아니라고 말하고, 쓰기는 그냥 된다. 이 세 줄을 어떻게 동시에 참으로 만들지가 글의 출발점이 됐다.

### 공식 문서가 먼저 못박는 단어, hint

소스로 들어가기 전에 `@Transactional(readOnly = true)`가 변환되는 `TransactionDefinition.isReadOnly()`의 Javadoc부터 봤다. 첫 문장과 그 뒤가 결론을 미리 박아둔다.

> Return whether to optimize as a read-only transaction.
>
> This just serves as a hint for the actual transaction subsystem; it will not necessarily cause failure of write access attempts. A transaction manager which cannot interpret the read-only hint will not throw an exception when asked for a read-only transaction.

두 단어가 전부였다.

첫째는 **optimize**다. 목적이 *최적화*지 *금지*가 아니다. 이름이 readOnly라 "쓰기 금지 모드"처럼 읽히지만, 설계 의도는 "이 트랜잭션은 쓰기를 안 하니 최적화할 게 있으면 하라"는 통보다.

둘째는 **it will not necessarily cause failure of write access attempts**다. 쓰기 시도를 *반드시* 실패시키지는 않는다. 해석하지 못하는 트랜잭션 매니저는 조용히 무시한다고 명시한다.

그러니까 (3)에서 INSERT가 성공한 건 버그가 아니라 문서가 미리 말해둔 동작이었다. 남은 건 (1)과 (2)가 왜 어긋났는가다. 그건 Javadoc이 아니라 소스가 답할 문제라, 내 환경에 묶인 버전을 그대로 풀어서 따라갔다. `spring-tx` / `spring-jdbc` **6.2.5**, `com.h2database:h2` **2.3.232** 기준이다.

### 힌트가 흐르는 두 갈래

트랜잭션이 시작되는 자리는 `AbstractPlatformTransactionManager.startTransaction`이다. 여기서 `readOnly`가 *서로 다른 두 곳*으로 갈라진다. 이 분기가 (1)과 (2)의 어긋남을 그대로 설명한다.

```java
// AbstractPlatformTransactionManager.java  L524
private TransactionStatus startTransaction(TransactionDefinition definition, ...) {
    ...
    doBegin(transaction, definition);          // L532  자원(커넥션/세션)에 적용
    ...
    prepareSynchronization(status, definition); // L538  ThreadLocal에 등록
    return status;
}
```

`doBegin`은 *자원*에 손을 댄다. JDBC라면 커넥션, JPA라면 Hibernate 세션이다. 이게 (2) 갈래다.

`prepareSynchronization`은 *ThreadLocal*에 등록한다. 이게 (1) 갈래다. 지난 글에서 한 트랜잭션을 한 스레드로 묶던 그 `TransactionSynchronizationManager`가 여기서 다시 나온다.

```java
// AbstractPlatformTransactionManager.java  L575
protected void prepareSynchronization(DefaultTransactionStatus status, TransactionDefinition definition) {
    if (status.isNewSynchronization()) {
        ...
        TransactionSynchronizationManager.setCurrentTransactionReadOnly(definition.isReadOnly()); // L581
        ...
    }
}
```

그 저장소는 ThreadLocal이다.

```java
// TransactionSynchronizationManager.java  L85
private static final ThreadLocal<Boolean> currentTransactionReadOnly =
        new NamedThreadLocal<>("Current transaction read-only status");

// L356
public static void setCurrentTransactionReadOnly(boolean readOnly) {
    currentTransactionReadOnly.set(readOnly ? Boolean.TRUE : null);
}

// L372
public static boolean isCurrentTransactionReadOnly() {
    return (currentTransactionReadOnly.get() != null);
}
```

(1)의 `true`는 정확히 여기서 나온 값이다. `readOnly`를 ThreadLocal에 심어두면, 그 트랜잭션 경계 안에서 같은 스레드로 도는 어떤 코드든 `isCurrentTransactionReadOnly()`로 꺼내 볼 수 있다. 읽기 전용 복제본으로 라우팅하는 `AbstractRoutingDataSource`가 읽는 값도 이것이다. 작은 디테일 하나는 `false`를 `null`로 저장한다는 점이다. ThreadLocal 누수를 줄이려는 의도이고, 그래서 조회가 `get() != null`이다.

여기까지가 "누가 힌트를 받는가"의 한 답이다. *같은 스레드에서 도는 모든 코드*가 ThreadLocal을 통해 받는다. 그런데 이건 "안다"는 신호일 뿐, "막는다"와는 다른 갈래다. 막느냐 마느냐는 (2) 갈래, 자원에 달려 있다.

### JDBC 갈래, con.setReadOnly(true) 한 줄

내 트랜잭션 매니저는 출력에서 본 `JdbcTransactionManager`였다. 이건 `DataSourceTransactionManager`를 상속한다. 그 `doBegin`이 커넥션에 하는 일은 단 한 곳을 거친다.

```java
// DataSourceUtils.java  L184
// Set read-only flag.
if (definition != null && definition.isReadOnly()) {
    try {
        ...
        con.setReadOnly(true);                        // L190  여기가 전부
    }
    catch (SQLException | RuntimeException ex) {
        ...
        // "read-only not supported" SQLException -> ignore, it's just a hint anyway   // L201 주석
        logger.debug("Could not set JDBC Connection read-only", ex);
    }
}
```

JDBC 경로에서 `readOnly`가 하는 일은 `con.setReadOnly(true)` 호출 한 줄이 끝이다. INSERT인지 SELECT인지 SQL을 들여다보는 코드는 어디에도 없다. 그리고 그 한 줄이 예외를 던져도 `catch`에서 삼킨다. 주석에 Spring이 직접 *it's just a hint anyway*라고 적어두었다. 공은 전적으로 JDBC 드라이버와 DB로 넘어간다.

그러면 (2)의 차례다. Spring은 분명히 `con.setReadOnly(true)`를 불렀는데, 왜 `con.isReadOnly()`는 `false`인가. 답은 Spring이 아니라 그 호출이 도착한 곳, H2에 있었다.

### 종착지 H2, readOnly ignored

`con.setReadOnly(true)`가 도착하는 H2의 구현을 열었다. 메서드 위 주석부터 결론을 박아둔다.

```java
// org/h2/jdbc/JdbcConnection.java  L555
/**
 * According to the JDBC specs, this setting is only a hint to the database
 * to enable optimizations - it does not cause writes to be prohibited.
 *
 * @param readOnly ignored
 */
@Override
public void setReadOnly(boolean readOnly) throws SQLException {
    try {
        if (isDebugEnabled()) {
            debugCode("setReadOnly(" + readOnly + ')');
        }
        checkClosed();   // readOnly 파라미터를 어디에도 쓰지 않는다
    } catch (Exception e) {
        throw logAndConvert(e);
    }
}
```

`@param readOnly ignored`. 메서드 본문은 `readOnly` 인자를 한 번도 사용하지 않는다. 커넥션이 닫혔는지 `checkClosed()`로 확인하고 끝이다. 완전한 no-op이다. (3)에서 INSERT가 막히지 않은 코드적 근거가 바로 이 메서드였다. H2는 JDBC 스펙의 표현 그대로 "이건 힌트일 뿐 쓰기를 막지 않는다"를 구현으로 지키고 있었다.

그럼 (2)의 `isReadOnly()`가 `false`인 것도 풀린다. 이 메서드는 방금 넘긴 값을 돌려주는 게 아니었다.

```java
// org/h2/jdbc/JdbcConnection.java  L580
public boolean isReadOnly() throws SQLException {
    ...
    getReadOnly = prepareCommand("CALL READONLY()", getReadOnly);   // L585
    ResultInterface result = getReadOnly.executeQuery(0, false);
    result.next();
    return result.currentRow()[0].getBoolean();
}
```

`isReadOnly()`는 `CALL READONLY()`로 *데이터베이스 파일 자체가 읽기 전용으로 열렸는지*를 조회한다. 커넥션에 넘긴 `setReadOnly` 값과는 무관하다. 나는 인메모리 읽기 쓰기 DB라 항상 `false`다.

그래서 (1)과 (2)는 모순이 아니었다. setter는 무시되고(H2 no-op), getter는 아예 다른 것(DB의 읽기 전용 모드)을 본다. (1) ThreadLocal은 Spring이 채운 값이라 `true`, (2) 커넥션은 H2가 답하는 값이라 `false`. 두 값은 서로 다른 출처를 가진, 각자 정확한 값이었다.

### 그럼 누가 막나, enforceReadOnly와 DB별 차이

정리하면 select 말고 다른 쿼리를 *막는 주체는 Spring이 아니다*. Spring은 `con.setReadOnly(true)`를 위임할 뿐이고, 실제 거부는 DB 엔진이 한다. 그리고 DB마다 다르다.

- **PostgreSQL**: 읽기 전용 트랜잭션에서 쓰기를 시도하면 `cannot execute INSERT in a read-only transaction` (SQLSTATE 25006)으로 거부한다.
- **MySQL / InnoDB**: 조건에 따라 `Cannot execute statement in a READ ONLY transaction` (1792)으로 거부한다. 드라이버 버전과 옵션에 따라 서버까지 전파되는지가 갈린다.
- **H2**: 거부하지 않는다. `setReadOnly`가 no-op이라 그대로 통과한다. 내 INSERT가 커밋된 이유다.

굳이 막고 싶으면 Spring에 스위치가 하나 있다. `DataSourceTransactionManager`의 `enforceReadOnly`다.

```java
// DataSourceTransactionManager.java  L416
protected void prepareTransactionalConnection(Connection con, TransactionDefinition definition)
        throws SQLException {
    if (isEnforceReadOnly() && definition.isReadOnly()) {     // L419
        try (Statement stmt = con.createStatement()) {
            stmt.executeUpdate("SET TRANSACTION READ ONLY");  // L421  Spring이 직접 SQL을 쏜다
        }
    }
}
```

이 플래그를 켜면 Spring이 트랜잭션 시작 시 `SET TRANSACTION READ ONLY` 문을 직접 실행한다. `setEnforceReadOnly`의 Javadoc이 차이를 분명히 한다.

> This mode of read-only handling goes beyond the Connection.setReadOnly hint that Spring applies by default. ... "SET TRANSACTION READ ONLY" enforces an isolation-level-like connection mode where data manipulation statements are strictly disallowed.

기본값 `setReadOnly`는 힌트라 DB가 무시할 수 있지만, `enforceReadOnly`는 *그 힌트를 넘어서* DB가 쓰기를 strictly disallow하게 만든다는 것이다. 단 이것도 결국 `SET TRANSACTION READ ONLY` 구문을 이해하는 DB(Oracle, MySQL, PostgreSQL)일 때 얘기다.

(3)의 보강 답이 여기서 나온다. 막히는 DB에서 막히면 DB가 `SQLException`을 던지고, 그건 Spring의 `SQLExceptionTranslator`를 거쳐 `DataAccessException` 계층(대개 `UncategorizedSQLException`)으로 번역된다. 내 환경에서는 애초에 막히지 않으니 던질 예외도 없었다.

### JPA였다면 달랐다, FlushMode.MANUAL

내 환경은 JdbcTemplate이라 readOnly가 커넥션 힌트 한 줄에서 끝났다. JPA였다면 한 겹이 더 있었을 것이라, `JpaTransactionManager`가 쓰는 `HibernateJpaDialect`도 같이 열어봤다.

```java
// HibernateJpaDialect.java  L161 (발췌)
if (isolationLevelNeeded || definition.isReadOnly()) {
    ...
    previousIsolationLevel = DataSourceUtils.prepareConnectionForTransaction(preparedCon, definition); // L165
}
...
FlushMode previousFlushMode = prepareFlushMode(session, definition.isReadOnly());  // L179
if (... rtd.isLocalResource()) {
    ...
    if (definition.isReadOnly()) {
        session.setDefaultReadOnly(true);   // L185
    }
}
```

먼저 눈에 들어온 건 L165다. JPA도 *내부에서 똑같은* `DataSourceUtils.prepareConnectionForTransaction`을 부른다. 즉 앞에서 본 `con.setReadOnly(true)`는 JPA에도 그대로 일어난다. JPA는 그 위에 두 가지를 *더* 얹는다.

하나는 `prepareFlushMode`다.

```java
// HibernateJpaDialect.java  L202
protected FlushMode prepareFlushMode(Session session, boolean readOnly) throws PersistenceException {
    FlushMode flushMode = session.getHibernateFlushMode();
    if (readOnly) {
        // We should suppress flushing for a read-only transaction.
        if (!flushMode.equals(FlushMode.MANUAL)) {
            session.setHibernateFlushMode(FlushMode.MANUAL);   // L207  자동 flush를 끈다
            return flushMode;
        }
    }
    ...
    return null;
}
```

평소 Hibernate는 `FlushMode.AUTO`라, 영속성 컨텍스트의 엔티티가 바뀌면 커밋이나 쿼리 직전에 dirty checking으로 변경을 감지해 자동으로 UPDATE를 발행한다. readOnly면 `MANUAL`로 바뀌어 *자동 flush가 일어나지 않는다*. 엔티티를 수정해도 UPDATE가 나가지 않고 변경이 조용히 사라진다.

다른 하나는 L185의 `session.setDefaultReadOnly(true)`다. 로드되는 엔티티를 읽기 전용으로 표시해, Hibernate가 dirty checking용 스냅샷(로딩 시점 필드 복사본)을 만들지 않게 한다. 이게 JPA에서 readOnly의 실질 성능 이득이다.

| | JDBC 경로 (내 환경) | JPA 경로 |
|---|---|---|
| `con.setReadOnly(true)` | 호출 (DataSourceUtils L190) | 호출 (HibernateJpaDialect L165, 동일) |
| `FlushMode.MANUAL` | 없음 | 적용 (L207) |
| `setDefaultReadOnly` (스냅샷 생략) | 없음 | 적용 (L185) |
| 실질 효과 | DB가 협조해야 발생 | flush 억제와 스냅샷 생략을 Hibernate가 자체 보장 |

JPA에서 "조회 메서드엔 readOnly를 붙여라"가 관용이 된 이유가 여기 있었다. JDBC와 달리 JPA의 readOnly 이득은 DB가 무엇이든 Hibernate 레벨에서 확정적으로 일어난다. 반대로 내 JdbcTemplate 환경은 저 두 줄이 아예 없으니, readOnly의 효과가 전부 DB 손에 달려 있다.

### 런타임인가, 컴파일 시점인가

마지막 질문은 짧게 닫혔다. 전부 런타임이다.

`@Transactional`은 런타임까지 유지되는 어노테이션이고, 트랜잭션 경계는 런타임에 프록시가 만든다. SQL 문자열은 더더욱 런타임 값이다. `readOnly = true` 메서드 안에서 `repository.save(...)`를 호출해도 컴파일 에러는 없고 IDE 경고도 없다. 타입 시스템이 보장하는 게 전혀 아니다. 빌드 단계에서 잡으려면 ArchUnit 같은 아키텍처 테스트를 직접 짜야 한다. 언어나 프레임워크 차원의 보장은 없다.

이건 캡슐화의 비용이기도 하다. 어노테이션 한 줄이 안전을 보장하는 것처럼 보이지만, 실제로는 런타임에, 그것도 DB가 협조할 때만 작동하는 약한 신호다.

### 정리, 여섯 가지 단편

- `readOnly`는 강제가 아니라 *hint*다. 공식 문서가 "optimize"라고 쓰고 "쓰기 시도를 반드시 실패시키지 않는다"고 못박는다.
- 힌트는 두 갈래로 흐른다. `prepareSynchronization`은 ThreadLocal에 등록하고(누가 *아는가*), `doBegin`은 자원에 적용한다(무엇이 *바뀌는가*). 내 측정의 (1) true는 앞 갈래, (2) false는 뒷 갈래에서 나온 값이다.
- JDBC 경로에서 readOnly가 하는 일은 `con.setReadOnly(true)` 한 줄이 전부다. Spring은 SQL을 검사하지 않는다. 막는 주체는 DB다.
- H2는 그 힌트를 명시적으로 버린다. `setReadOnly`는 `@param readOnly ignored`인 no-op이고, `isReadOnly`는 커넥션 값이 아니라 `CALL READONLY()`로 DB 모드를 본다. 내 환경에서 INSERT가 통과한 정확한 이유다.
- JPA였다면 같은 `setReadOnly`에 더해 `FlushMode.MANUAL`과 `setDefaultReadOnly`가 붙는다. 그래서 JPA의 readOnly 이득은 DB와 무관하게 확정적이다.
- 강제가 필요하면 `enforceReadOnly`가 `SET TRANSACTION READ ONLY`를 직접 쏜다. 단 그 구문을 이해하는 DB에서만 의미가 있다.

### 다음에 추상화를 만나면 던질 세 질문

지난 글의 결론이 "Spring은 롤백 시점만 결정하고 되돌리는 일은 DB가 한다"였는데, readOnly도 같은 모양이었다. Spring은 *선언*을 흘려보내고, *집행*은 자원과 DB가 한다. 둘을 분리해서 보면 readOnly가 환경마다 다르게 동작하는 게 이상하지 않다.

그래서 다음에 비슷한 어노테이션 하나를 만나면 세 질문을 먼저 던지기로 했다.

1. 이건 강제(enforce)인가 힌트(hint)인가
2. 효과를 내려면 누가 집행하는가 (Spring인가, 드라이버인가, DB인가, ORM인가)
3. 지금 이 환경에 그 집행 주체가 실제로 있는가

readOnly는 이 세 질문에 각각 "힌트 / DB 또는 Hibernate / 환경마다 다름"으로 답하는 사례였다. 내 H2와 JdbcTemplate 환경에서는 집행 주체가 사실상 없어서, readOnly는 지금 *성능 장치라기보다 의도를 적어둔 선언*에 가깝다. 나중에 실제 DB로 옮기거나 읽기 복제본을 붙이면 그때 ThreadLocal에 박힌 그 `true`가 라우팅의 입구로 깨어날 것이다. 그 자리를 미리 비워두는 것까지가 지금 readOnly를 붙여두는 값이라고, 일단은 정리해둔다.
