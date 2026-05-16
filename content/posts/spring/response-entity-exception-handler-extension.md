---
title: "ResponseEntityExceptionHandler를 상속하고 나서야 보였던 응집도"
category: "spring"
slug: "response-entity-exception-handler-extension"
num: 3
date: 2026-05-16
description: "사이클2 미션을 제출하고 다른 크루의 PR을 둘러보다 만난 패턴. 내 GlobalExceptionHandler에서 500으로 새던 405/415/타입 불일치 케이스를 정정하고, 핸들러마다 반복되던 type/title/instance/로깅 후처리를 handleExceptionInternal 한 곳으로 모았다. 코드 줄 수는 비슷한데 응집도가 다르게 느껴진 이유를 정리한다."
tags: ["스프링", "예외 처리", "ProblemDetail", "ResponseEntityExceptionHandler", "우테코"]
---

### 시작점, 다른 크루의 PR 한 줄

우테코 사이클2 미션을 제출하고 다른 크루의 PR을 둘러보다가 시오([gleaming9](https://github.com/gleaming9))의 코드에서 한 줄을 봤다.

```java
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
```

내 GlobalExceptionHandler는 그냥 `@RestControllerAdvice`만 붙인 평범한 클래스였다. 클래스 선언 한 줄이 달랐을 뿐인데 무엇이 바뀌는 건지 짚이지 않았다. 정확히 알고 싶어서 내 코드와 시오 코드를 나란히 놓고 들여다본 결과를 정리한다.

### 발견, 내 코드에서 500으로 새던 케이스

내 사이클2 코드를 다시 켜놓고 몇 가지 비정상 요청을 보냈다.

```bash
# 1) 지원하지 않는 메서드
curl -i -X PATCH http://localhost:8080/reservations/1

# 2) 지원하지 않는 미디어 타입
curl -i -X POST http://localhost:8080/reservations \
     -H "Content-Type: text/plain" -d "not json"

# 3) 경로 변수 타입 불일치
curl -i -X DELETE http://localhost:8080/reservations/abc
```

세 케이스 모두 응답이 `500 Internal Server Error`였다. HTTP 시맨틱으로 보면 각각 405, 415, 400이어야 한다.

이유는 내 코드를 보면 곧 드러났다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(...) { ... }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(...) { ... }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ProblemDetail handleBusinessRuleViolation(...) { ... }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(...) { ... }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ProblemDetail handleMissingParam(...) { ... }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(...) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ...);
    }
}
```

Spring MVC가 내부적으로 던지는 `HttpRequestMethodNotSupportedException`, `HttpMediaTypeNotSupportedException`, `MethodArgumentTypeMismatchException`을 내가 명시적으로 잡지 않았다. 그래서 최하단 `Exception.class` catch-all로 떨어져 전부 500으로 나갔다.

해결책 한 가지는 단순했다. 각 예외마다 `@ExceptionHandler`를 추가하면 된다. 다만 그러면 핸들러 메서드가 10개 이상 늘어나고, 모두 `status 설정 + type/title/instance 채움 + 로깅`이라는 동일한 후처리를 반복하게 된다.

시오가 채택한 다른 방향이 `ResponseEntityExceptionHandler` 상속이었다.

### 원리, ResponseEntityExceptionHandler가 제공하는 것

Spring 공식 Javadoc에서 이 클래스를 이렇게 설명한다.

> A convenient base class for `@ControllerAdvice` classes that wish to provide centralized exception handling across all `@RequestMapping` methods through `@ExceptionHandler` methods. This base class provides an `@ExceptionHandler` method for handling internal Spring MVC exceptions.

핵심은 두 가지다.

1. 이 추상 클래스는 Spring MVC가 내부적으로 던지는 표준 예외들에 대한 `@ExceptionHandler`를 *이미 등록*해뒀다. 약 20개.
2. 각 예외 처리 흐름이 마지막에 `handleExceptionInternal`이라는 *공통 후처리 훅*을 거친다.

소스를 직접 보면 클래스 상단에 이런 시그니처가 있다.

```java
@ExceptionHandler({
    HttpRequestMethodNotSupportedException.class,
    HttpMediaTypeNotSupportedException.class,
    HttpMediaTypeNotAcceptableException.class,
    MissingPathVariableException.class,
    MissingServletRequestParameterException.class,
    MethodArgumentNotValidException.class,
    NoResourceFoundException.class,
    TypeMismatchException.class,
    HttpMessageNotReadableException.class,
    // ... 약 20개
})
public final ResponseEntity<Object> handleException(Exception ex, WebRequest request) {
    // 예외 타입에 따라 protected handleXxx() 호출
}
```

예외가 던져졌을 때 흐름을 따라가면 이렇다.

```
컨트롤러에서 예외 throw
        ↓
DispatcherServlet이 catch
        ↓
HandlerExceptionResolver 체인에서 잡음
        ↓
ResponseEntityExceptionHandler.handleException(ex, request)
        ↓
예외 타입에 따라 분기:
  if (ex instanceof HttpRequestMethodNotSupportedException)
      return handleHttpRequestMethodNotSupported(...)
  else if (ex instanceof MethodArgumentNotValidException)
      return handleMethodArgumentNotValid(...)
  ... (약 20개 분기)
        ↓
각 handleXxx()는 ProblemDetail body 생성
        ↓
handleExceptionInternal(ex, body, headers, status, request)
        ↓
ResponseEntity<Object> 반환
```

내가 두 번 읽어야 했던 포인트가 있었다. **모든 예외별 분기가 마지막에 `handleExceptionInternal`을 거친다.** 그래서 type, title, instance, 로깅 같은 *공통 후처리*는 `handleXxx()` 각각을 override할 게 아니라 `handleExceptionInternal` 하나만 override하면 모든 흐름에 한꺼번에 적용된다.

### 실측 매칭, Before와 After

step2 브랜치에서 위 패턴을 적용해 커밋 [`2f7f3c66`](https://github.com/JohnPrk/spring-roomescape-member/commit/2f7f3c66)로 정리했다. 코드의 핵심 부분.

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String TYPE_BASE = "https://roomescape.example/problems/";

    // (1) 내 도메인 예외는 그대로 @ExceptionHandler로
    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException ex, WebRequest request) {
        return build(HttpStatus.NOT_FOUND, "not-found", "리소스를 찾을 수 없음",
                     ex.getMessage(), ex, request);
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(...) { ... }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ProblemDetail handleBusinessRuleViolation(...) { ... }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(...) { ... }   // 500 fallback

    // (2) Validation 예외는 errors 필드를 추가하기 위해 override
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status,
                "요청 본문의 일부 필드가 유효하지 않습니다.");
        List<FieldErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldErrorDetail::from)
                .toList();
        problem.setProperty("errors", errors);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    // (3) 공통 후처리, 모든 흐름이 통과한다
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        ResponseEntity<Object> response = super.handleExceptionInternal(ex, body, headers, status, request);
        if (response != null && response.getBody() instanceof ProblemDetail problem) {
            decorate(problem, ex, status, request);
        }
        logException(ex, status, request);
        return response;
    }

    private void decorate(ProblemDetail problem, Exception ex, HttpStatusCode status, WebRequest request) {
        SlugAndTitle mapping = mappingFor(ex, status);
        problem.setType(URI.create(TYPE_BASE + mapping.slug()));
        problem.setTitle(mapping.title());
        problem.setInstance(URI.create(extractUri(request)));
    }

    private SlugAndTitle mappingFor(Exception ex, HttpStatusCode status) {
        if (ex instanceof MethodArgumentNotValidException) {
            return new SlugAndTitle("validation-error", "요청 본문 검증 실패");
        }
        return switch (status.value()) {
            case 400 -> new SlugAndTitle("bad-request", "잘못된 요청");
            case 405 -> new SlugAndTitle("method-not-supported", "지원하지 않는 HTTP 메서드");
            case 415 -> new SlugAndTitle("media-type-not-supported", "지원하지 않는 미디어 타입");
            default -> new SlugAndTitle("internal-error", "서버 내부 오류");
        };
    }

    private void logException(Exception ex, HttpStatusCode status, WebRequest request) {
        if (status.is5xxServerError()) {
            log.error("{} {} → {}", extractMethod(request), extractUri(request), status.value(), ex);
            return;
        }
        log.warn("{} {} → {} {}", extractMethod(request), extractUri(request), status.value(), ex.getMessage());
    }
}
```

같은 요청 `PATCH /reservations/1`의 응답이 어떻게 달라졌는지 보면 가장 분명하다.

**Before**

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json

{
  "type": "https://roomescape.example/problems/internal-error",
  "title": "서버 내부 오류",
  "status": 500,
  "detail": "요청을 처리하는 중 알 수 없는 오류가 발생했습니다.",
  "instance": "/reservations/1"
}
```

**After**

```http
HTTP/1.1 405 Method Not Allowed
Allow: GET, POST, DELETE
Content-Type: application/problem+json

{
  "type": "https://roomescape.example/problems/method-not-supported",
  "title": "지원하지 않는 HTTP 메서드",
  "status": 405,
  "detail": "Method 'PATCH' is not supported.",
  "instance": "/reservations/1"
}
```

상태 코드가 405가 되고 `Allow` 헤더까지 자동으로 붙는다. 후자는 내가 짠 게 아니라 부모 클래스의 `handleHttpRequestMethodNotSupported`가 응답 헤더로 넣어준 것이다.

회귀 방지를 위해 통합 테스트를 세 개 박았다.

```java
@Test
void 경로_변수_타입_불일치는_400() {
    RestAssured.given().log().all()
            .when().delete("/reservations/abc")
            .then().log().all()
            .statusCode(400);
}

@Test
void 지원하지_않는_HTTP_메서드는_405() {
    RestAssured.given().log().all()
            .when().patch("/reservations/1")
            .then().log().all()
            .statusCode(405);
}

@Test
void 지원하지_않는_미디어_타입은_415() {
    RestAssured.given().log().all()
            .contentType(ContentType.TEXT)
            .body("not json")
            .when().post("/reservations")
            .then().log().all()
            .statusCode(415);
}
```

상태 코드만 검증한다. 메시지 문구나 type URI는 변할 수 있는 부분이라 일부러 단단하게 묶지 않았다.

### 응집도가 다르게 느껴진 이유

리팩토링 전후 *코드 줄 수*는 비슷하다. 그런데 다 짜고 나서 다시 읽어보면 코드의 무게가 다르게 느껴진다. 이유를 정리하면 *변경 축의 분리*다.

Before에서 각 핸들러는 세 가지 책임을 한 몸에 짊어졌다.

1. 예외 종류별 분기 (어떤 예외냐)
2. 응답 body 구성 (type, title, status, detail, instance)
3. 로깅

핸들러를 N개 추가하면 세 일이 N번 반복된다. 응답 형식 정책이 바뀌면 N개 다 손대야 한다.

After에서는 두 축으로 갈렸다.

1. *수직 축*, 예외 종류별 분기. 새 예외가 생기면 여기만 늘어난다.
2. *수평 축*, 공통 후처리. 응답 형식이 바뀌면 `handleExceptionInternal` 한 곳만 손대면 된다.

게다가 Spring MVC 표준 예외 약 20개는 부모 클래스가 *이미 수직 축을 채워뒀다*. 내가 직접 짤 필요가 없었다.

SOLID 용어로 옮겨 적으면 두 가지가 떨어진다.

- 단일 책임 원칙. 각 메서드가 한 가지 변경 이유만 가진다.
- 개방 폐쇄 원칙. 새 예외 추가 시 후처리 코드는 *닫혀 있고* 분기 코드만 *열려 있다*.

### 다음에 같은 자리에서 쓸 룰

- REST API용 전역 예외 처리는 `extends ResponseEntityExceptionHandler`를 *기본값*으로 시작한다. 상속을 안 하는 게 특별한 결정이지, 그 반대가 아니다.
- 공통 후처리(type/title/instance/로깅)는 `handleExceptionInternal` 한 군데에 둔다. `@ExceptionHandler` 메서드 본문에 같은 후처리를 반복해서 박지 않는다.
- `super.handleExceptionInternal()` 호출은 빼먹지 않는다. ProblemDetail body 생성과 Content-Type 설정이 거기서 일어난다.
- 응답 body가 `ProblemDetail`이 아닐 수도 있다. 일부 비동기 예외 흐름에서는 null이거나 다른 타입이다. `instanceof ProblemDetail problem` 패턴 매칭으로 보호한다.
- `@ExceptionHandler(Exception.class)` catch-all은 남겨둔다. 부모가 잡아주지 않는 예상치 못한 RuntimeException용 최후의 그물이다. 다만 로깅 정책을 분리해서 5xx만 스택트레이스를 찍는다.
