---
title: "DuplicateKeyException은 누가 만드는가, 제약 한 줄 말고 내가 짠 게 없는데"
category: "spring"
slug: "duplicate-key-exception-translation"
num: 13
date: 2026-05-30
description: "우테코 룸이스케이프 대기 미션에서 중복 대기 신청을 막으려 reservation_waiting에 UNIQUE 제약 한 줄을 걸고, 충돌 시 DuplicateKeyException을 409로 매핑했다. 프로덕션 코드에서 실제로 바뀐 건 DDL 한 줄과 예외를 상태 코드로 라우팅한 핸들러뿐, 에러 코드를 보거나 SQLState를 파싱하는 코드는 한 줄도 없었다. 그런데 DuplicateKeyException이라는 정확한 타입이 이미 와 있었다. 이게 어디서 오는지 따라가다, 흔히 말하는 sql-error-codes.xml이 내 앱에서는 끼어들지도 않는다는 걸 실측으로 확인했다. Spring 6.0부터 기본 번역기가 SQLExceptionSubclassTranslator로 바뀐 자리, JDBC 4 표준 예외 서브클래스가 실제로 번역을 맡는 경로, 그리고 H2의 23505와 MySQL의 1062가 같은 예외로 수렴하는 두 겹의 이유까지 정리했다."
tags: ["스프링", "DuplicateKeyException", "SQLException", "예외 변환", "JdbcTemplate", "DataAccessException", "H2", "MySQL", "JDBC", "우테코"]
---

### 시작점, 제약 한 줄과 409 매핑

우테코 룸이스케이프 대기 미션에서 같은 사람이 같은 슬롯에 두 번 대기 신청하는 걸 막아야 했다. 서비스 계층의 사전 체크만으로는 동시 요청이 둘 다 통과한 뒤 둘 다 저장될 수 있어서, DB에 제약을 하나 걸었다.

```sql
-- schema.sql
CONSTRAINT uk_waiting_name_reservation UNIQUE (name, reservation_id)
```

그리고 사전 체크를 우회한 경합 INSERT가 500으로 새지 않도록, 제약 위반으로 올라온 예외를 409로 매핑했다.

```java
@ExceptionHandler(DuplicateKeyException.class)
public ProblemDetail handleDuplicateKey(DuplicateKeyException ex, WebRequest request) {
    HttpStatus status = HttpStatus.CONFLICT;
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, DETAIL_DUPLICATE_KEY);
    applyType(problem, ProblemType.CONFLICT, request);
    logException(ex, status, request);
    return problem;
}
```

프로덕션 코드에서 실제로 바뀐 건 이게 전부다. DDL 한 줄, 그리고 그 예외를 상태 코드로 라우팅하는 핸들러 하나. 에러 코드 `23505`를 보거나 `SQLState`를 파싱하거나 H2를 아는 코드는 한 줄도 쓰지 않았다. 그런데 핸들러에 도착한 시점에 이미 `org.springframework.dao.DuplicateKeyException`이라는 정확한 타입이 와 있었다. 제약을 건 것 말고는 한 게 없는데, 누가 이 예외를 이 타입으로 만들어 보냈나.

한 가지 먼저 밝혀둔다. 이 의문은 내가 혼자 떠올린 게 아니다. 변경이 너무 작아서 오히려 이상했고, 그 작음을 짚어준 대화에서 질문이 나왔다. 그 질문을 끝까지 따라간 기록이다.

---

### 통념부터, sql-error-codes.xml이 한다는 설명

검색하면 대부분 이렇게 설명한다. spring-jdbc.jar 안에는 `sql-error-codes.xml`이 들어 있고, 거기 DB별로 어떤 벤더 에러 코드가 어떤 예외에 해당하는지가 적혀 있다. H2 항목을 jar에서 직접 꺼내면 이렇다.

```xml
<bean id="H2" class="org.springframework.jdbc.support.SQLErrorCodes">
    ...
    <property name="duplicateKeyCodes">
        <value>23001,23505</value>
    </property>
    <property name="dataIntegrityViolationCodes">
        <value>22001,22003,...,23502,23503,...</value>
    </property>
    ...
</bean>
```

H2가 던진 에러 코드 `23505`가 `duplicateKeyCodes`에 들어 있으니 `DuplicateKeyException`이 되고, FK 위반인 `23503`은 `dataIntegrityViolationCodes`에 있으니 그 상위인 `DataIntegrityViolationException`이 된다. 깔끔한 설명이고, 파일도 실제로 존재한다. 그럴듯해서 그대로 믿을 뻔했다.

그런데 내 프로젝트가 정말 이 경로를 타는지는 확인한 적이 없었다. 임시 테스트를 하나 넣어, 실제로 무엇이 일어나는지 찍어봤다.

---

### 실측, 내 앱은 그 경로를 타지 않는다

같은 `(name, reservation_id)`로 두 번 저장해 예외를 일으키고, 잡힌 예외와 그 원인, 그리고 `JdbcTemplate`이 기본으로 쓰는 번역기까지 출력했다.

```
[1] Spring 번역 예외   = org.springframework.dao.DuplicateKeyException
[2] cause (원본 JDBC)  = org.h2.jdbc.JdbcSQLIntegrityConstraintViolationException
[3] cause 상속 계층:
       org.h2.jdbc.JdbcSQLIntegrityConstraintViolationException
       java.sql.SQLIntegrityConstraintViolationException
       java.sql.SQLNonTransientException
       java.sql.SQLException
[4] errorCode          = 23505
[5] sqlState           = 23505
[6] JdbcTemplate 기본 번역기 + fallback 체인:
       org.springframework.jdbc.support.SQLExceptionSubclassTranslator
       org.springframework.jdbc.support.SQLStateSQLExceptionTranslator
```

`[6]`에서 멈췄다. 내 앱이 실제로 쓰는 번역기는 `SQLExceptionSubclassTranslator`고, 그 뒤를 받치는 fallback은 `SQLStateSQLExceptionTranslator`다. `sql-error-codes.xml`을 읽는 클래스인 `SQLErrorCodeSQLExceptionTranslator`는 체인 어디에도 없다. 통념이 말한 그 파일은 내 번역 경로에 끼어들지조차 않았다.

---

### 왜 그 경로가 아닌가, JdbcAccessor의 분기

기본 번역기를 누가 정하는지는 `JdbcAccessor.getExceptionTranslator()`에 그대로 있다(spring-jdbc 6.2.5).

```java
if (SQLErrorCodeSQLExceptionTranslator.hasUserProvidedErrorCodesFile()) {
    exceptionTranslator = new SQLErrorCodeSQLExceptionTranslator(obtainDataSource());
}
else {
    exceptionTranslator = new SQLExceptionSubclassTranslator();
}
```

`hasUserProvidedErrorCodesFile()`는 jar 안의 기본 파일이 아니라, **내가 직접** classpath 루트에 둔 `sql-error-codes.xml`이 있는지를 본다. 내 프로젝트엔 그런 파일이 없으니 `else` 가지로 가고, 그래서 `SQLExceptionSubclassTranslator`가 선택된다. 실측의 `[6]`과 정확히 맞는다.

공식 레퍼런스도 같은 말을 한다.

> "As of 6.0, the default exception translator is SQLExceptionSubclassTranslator, detecting JDBC 4 SQLException subclasses with a few extra checks, and with a fallback to SQLState introspection through SQLStateSQLExceptionTranslator."
>
> ([Spring Framework Reference, Data Access / JDBC](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html))

즉 `sql-error-codes.xml`로 번역하는 방식은 6.0부터 기본이 아니라 opt-in이 됐다. 통념은 틀린 게 아니라, 6.0 이전의 기본값을 지금의 기본값처럼 설명하고 있었던 것이다.

---

### 그럼 무엇이 번역하나, JDBC 4 표준 예외 서브클래스

내 앱이 실제로 타는 경로를 코드까지 따라가면 네 단계다. 전부 6.2.5 소스와 위 실측으로 확인된다.

**1. H2가 JDBC 4 표준 예외를 던진다.** UNIQUE 위반 INSERT에서 H2는 `JdbcSQLIntegrityConstraintViolationException`을 던지는데, 이게 `java.sql.SQLIntegrityConstraintViolationException`을 상속한다(실측 `[3]`). 이건 JDBC 4가 정의한 표준 예외 타입이다. `errorCode`, `sqlState` 모두 `23505`.

**2. JdbcTemplate이 번역기에 위임한다.**

```java
protected DataAccessException translateException(String task, @Nullable String sql, SQLException ex) {
    DataAccessException dae = getExceptionTranslator().translate(task, sql, ex);
    return (dae != null ? dae : new UncategorizedSQLException(task, sql, ex));
}
```

번역에 실패하면 `UncategorizedSQLException`으로 떨어뜨린다. 분류를 못 해도 최소한 무언가는 던진다는 안전망이다.

**3. SQLExceptionSubclassTranslator가 예외의 타입을 본다.** 에러 코드 표가 아니라 `instanceof`로 JDBC 표준 서브클래스를 가른다.

```java
if (ex instanceof SQLIntegrityConstraintViolationException) {
    if (SQLStateSQLExceptionTranslator.indicatesDuplicateKey(ex.getSQLState(), ex.getErrorCode())) {
        return new DuplicateKeyException(buildMessage(task, sql, ex), ex);
    }
    return new DataIntegrityViolationException(buildMessage(task, sql, ex), ex);
}
```

제약 위반이면 `SQLIntegrityConstraintViolationException` 가지로 들어오고, 그게 unique인지 아닌지를 `indicatesDuplicateKey`가 가른다.

**4. indicatesDuplicateKey가 표준값과 벤더 코드를 한 곳에서 안다.**

```java
private static final Set<Integer> DUPLICATE_KEY_ERROR_CODES = Set.of(
        1,     // Oracle
        301,   // SAP HANA
        1062,  // MySQL/MariaDB
        2601,  // MS SQL Server
        2627   // MS SQL Server
    );

static boolean indicatesDuplicateKey(@Nullable String sqlState, int errorCode) {
    return ("23505".equals(sqlState) ||
            ("23000".equals(sqlState) && DUPLICATE_KEY_ERROR_CODES.contains(errorCode)));
}
```

H2는 `sqlState`가 `23505`라 첫 조건에서 바로 참이 된다. 벤더 코드 표를 뒤질 것도 없이 `DuplicateKeyException`으로 간다.

---

### 왜 H2도 MySQL도 코드 한 줄 없이 되는가

포터빌리티가 두 겹으로 깔려 있다.

**겹 1, JDBC 4 표준 예외 계층은 드라이버의 책임이다.** JDBC 4 규약상 호환 드라이버는 실패 종류에 맞는 `SQLException` 서브클래스를 던져야 한다. 제약 위반이면 `java.sql.SQLIntegrityConstraintViolationException`이다. H2도(실측으로 확인한 `JdbcSQLIntegrityConstraintViolationException`), MySQL Connector/J도 이 표준 타입을 던진다. 그래서 Spring의 `instanceof SQLIntegrityConstraintViolationException`은 어느 벤더인지 몰라도 둘 다 잡는다.

**겹 2, indicatesDuplicateKey가 표준과 벤더 관례를 둘 다 안다.** SQL 표준에서 `SQLState 23505`는 unique 위반을 뜻하고, H2와 PostgreSQL이 이 정밀한 값을 준다. 일부 벤더는 뭉뚱그린 `23000`("무결성 위반")만 주는데, 이때는 벤더 에러 코드로 구분한다. MySQL의 `ER_DUP_ENTRY = 1062`가 그 `DUPLICATE_KEY_ERROR_CODES`에 들어 있다.

| 논리적 실패 | H2 | MySQL | 번역 결과 |
|---|---|---|---|
| unique 중복 | sqlState 23505 | sqlState 23000 + code 1062 | `DuplicateKeyException` |
| FK 위반 | (SQLState 23) | (SQLState 23) | `DataIntegrityViolationException` |

H2는 `"23505".equals(sqlState)`로, MySQL은 `"23000".equals(sqlState) && code 1062`로 같은 `indicatesDuplicateKey`를 통과해 같은 예외로 수렴한다. 벤더 지식이 내 코드에 없는 이유는, 그게 (1) JDBC 표준 예외 서브클래스(드라이버가 책임)와 (2) 표준값 `23505`와 벤더 코드 집합을 한 메서드에 가둔 Spring, 이 두 군데에 이미 들어 있기 때문이다.

여기서 솔직하게 갈라둔다. H2 부분은 위 실측 그대로다. MySQL 부분은 추론이다. 근거는 Spring 소스의 `1062 ∈ DUPLICATE_KEY_ERROR_CODES`, JDBC 4 규약, 그리고 MySQL 공식 문서의 `ER_DUP_ENTRY = 1062 / SQLState 23000`이다. 이 환경엔 MySQL이 없어 직접 돌리지는 못했다.

---

### 통념이 완전히 틀린 건 아니다, sql-error-codes.xml의 실제 자리

`SQLErrorCodeSQLExceptionTranslator`와 `sql-error-codes.xml`은 죽은 코드가 아니다. 더 정밀한 opt-in 경로다. classpath 루트에 내가 직접 `sql-error-codes.xml`을 두면 `JdbcAccessor`가 그 번역기로 전환되고, jar의 기본 파일과 내 오버라이드를 함께 읽어 벤더 에러 코드로 매칭한다. 공식 문서가 그 조건을 명시한다.

> "SQLErrorCodeSQLExceptionTranslator is the implementation of SQLExceptionTranslator that is used by default when a file named sql-error-codes.xml is present in the root of the classpath. This implementation uses specific vendor codes. It is more precise than SQLState or SQLException subclass translation."
>
> ([Spring Framework Reference, Data Access / JDBC](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html))

그러니 통념은 "틀린 설명"이 아니라 "옛 기본값이자 지금은 opt-in인 경로를, 현재 기본 경로처럼 말한 것"이다. 차이를 가른 건 검색 결과가 아니라 내 버전에서 직접 찍어본 `[6]` 한 줄이었다.

그리고 이 모든 번역이 존재하는 이유를 공식 문서가 한 문단으로 못 박는다.

> "Spring provides a convenient translation from technology-specific exceptions, such as SQLException to its own exception class hierarchy, which has DataAccessException as the root exception. These exceptions wrap the original exception so that there is never any risk that you might lose any information about what might have gone wrong."
>
> ([Spring Framework Reference, DAO support](https://docs.spring.io/spring-framework/reference/data-access/dao.html))

---

### 정리

제약 한 줄에서 출발해 세 가지로 도착했다.

1. 프로덕션에서 바뀐 건 DDL 한 줄과 예외를 상태 코드로 라우팅한 핸들러뿐이다. `DuplicateKeyException`은 내가 만든 게 아니라 받은 것이다. 번역 로직은 내 코드 밖에 이미 있었다.
2. 그 번역을 하는 건 (6.0 기준) `sql-error-codes.xml`이 아니라 JDBC 4 표준 예외 서브클래스를 보는 `SQLExceptionSubclassTranslator`다. 직접 찍어보기 전까지는 나도 그 파일이 하는 줄 알았다.
3. 벤더 중립이 공짜인 이유는 두 겹이다. JDBC 표준 예외 계층은 드라이버가 책임지고, 표준값과 벤더 관례는 Spring이 한 메서드에 가둬뒀다. H2의 `23505`와 MySQL의 `1062`가 같은 예외로 모인다.

가장 늦게 받아들인 건 두 번째다. "라이브러리가 알아서 해준다"는 느낌은 편하지만, 그 "알아서"의 실제 경로는 내 버전에서 통념과 다를 수 있다.

---

### 다음 룰

- 라이브러리가 "알아서 해준다"고 느껴질 때, 내 버전에서 정말 그 경로인지 한 번 찍어본다. 통념은 종종 옛 기본값을 설명한다.
- 예외 핸들러를 등록할 때, 그 예외가 어느 번역기를 거쳐 왔는지 한 번은 확인한다. 6.0 전후로 기본 번역기가 다르다.
- 직접 못 돌려본 부분(다른 벤더 등)은 글에서도 실측과 추론을 갈라 적는다. 같은 결론이라도 근거의 무게가 다르다.
