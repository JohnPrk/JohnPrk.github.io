---
title: "GlobalExceptionHandler를 한 번 더 다듬으며, 두 갈래 경로와 ProblemType enum"
category: "spring"
slug: "global-exception-handler-anatomy"
num: 7
date: 2026-05-17
description: "extends ResponseEntityExceptionHandler 패턴까지 들인 다음에도 내 GlobalExceptionHandler에는 헬퍼 두 개의 책임이 묘하게 겹쳤고 slug와 title 매직 스트링이 흩어져 있었다. ProblemType enum으로 짝을 단일화하고 applyType을 추출해 두 갈래 경로의 공통 후처리를 한 곳에 모은 결과를 정리한다."
tags: ["스프링", "예외 처리", "ProblemDetail", "ProblemType", "우테코"]
---

### 시작점, 응집도는 잡혔는데 정돈이 덜 됐다

[직전 글](/spring/response-entity-exception-handler-extension)에서 `extends ResponseEntityExceptionHandler`로 갈아 끼우고 응집도를 한 번 잡았다. 그런데 며칠 뒤 다시 켜놓고 들여다보니 무언가 정돈이 덜 됐다는 인상이 남았다. 정확히 짚어보면 두 가지였다.

1. `build`와 `decorate`라는 헬퍼 둘의 책임이 묘하게 겹쳤다. 둘 다 type, title, instance를 채우는 일을 하는데 시그니처가 달라서 *공통 부분*이 한눈에 안 들어왔다.
2. `slug`와 `title`이 문자열로 흩어져 있었다. `"not-found"` 같은 매직 스트링이 핸들러마다 박혀 있는 식이라 컴파일러가 도와줄 게 없었다.

이 두 가지를 정리한 결과가 지금의 GlobalExceptionHandler다. *공통적인 패턴* (위 직전 글들에서 이미 다룬 상속, `handleExceptionInternal` 훅, `@RestControllerAdvice`의 빈 등록)을 제외하고, 이 클래스만의 결정을 한 줄씩 짚어둔다.

### 두 갈래 경로

이 클래스가 처리하는 예외는 출신이 두 갈래다.

```
경로 A. 내 도메인 예외 (RoomescapeException 계열)
    NotFoundException
    UnauthorizedException
    ConflictException
    BusinessRuleViolationException
    + handleUnexpected (catch-all)
        ↓
    @ExceptionHandler가 받아서 status를 *내가 명시*
        ↓
    buildProblem(status, type, ex, request)
        ↓
    applyType + logException

경로 B. Spring 표준 예외 (~20개)
    HttpRequestMethodNotSupportedException
    HttpMediaTypeNotSupportedException
    MethodArgumentNotValidException
    NoResourceFoundException
    MethodArgumentTypeMismatchException
    ...
        ↓
    부모 클래스의 handleXxx() 분기
        ↓
    handleExceptionInternal(ex, body, headers, status, request)
        ↓
    applyType(problem, mappingFor(ex, status), request) + logException
```

두 경로의 결정적인 차이는 *status를 누가 정하느냐*다. 경로 A는 내가 코드로 박는다. 경로 B는 Spring이 예외 타입을 보고 정한다. 같은 *공통 후처리* (type, title, instance, logging)를 거치는데, 진입점이 둘이라는 사실이 헬퍼 분담 결정의 출발점이었다.

### ProblemType, slug와 title을 짝으로 묶기

처음에는 핸들러마다 `slug`와 `title`을 문자열로 박았다.

```java
return build(HttpStatus.NOT_FOUND, "not-found", "리소스를 찾을 수 없음",
             ex.getMessage(), ex, request);
```

이러면 `slug`와 `title`이 *독립 변수*처럼 보이지만 사실은 *짝*이다. `"not-found"`라는 slug가 박힌 자리에는 `"리소스를 찾을 수 없음"`이라는 title이 따라와야 한다. 짝을 자료구조로 표현하는 적합한 도구가 enum이다.

```java
public enum ProblemType {

    NOT_FOUND("not-found", "리소스를 찾을 수 없음"),
    UNAUTHORIZED("unauthorized", "본인 확인 실패"),
    CONFLICT("conflict", "요청이 현재 상태와 충돌함"),
    BUSINESS_RULE_VIOLATION("business-rule-violation", "비즈니스 정책 위반"),
    VALIDATION_ERROR("validation-error", "요청 본문 검증 실패"),
    BAD_REQUEST("bad-request", "잘못된 요청"),
    METHOD_NOT_SUPPORTED("method-not-supported", "지원하지 않는 HTTP 메서드"),
    MEDIA_TYPE_NOT_SUPPORTED("media-type-not-supported", "지원하지 않는 미디어 타입"),
    NOT_ACCEPTABLE("not-acceptable", "응답 가능한 미디어 타입 없음"),
    NO_RESOURCE("no-resource", "리소스를 찾을 수 없음"),
    INTERNAL_ERROR("internal-error", "서버 내부 오류");

    private static final String TYPE_BASE = "https://roomescape.example/problems/";
    private final String slug;
    private final String title;

    ProblemType(String slug, String title) {
        this.slug = slug;
        this.title = title;
    }

    public URI uri() {
        return URI.create(TYPE_BASE + slug);
    }

    public String title() {
        return title;
    }
}
```

`URI uri()`까지 enum 안에 두면 호출처에서 `URI.create(...)` 같은 잡 코드를 안 봐도 된다. 한 가지 작은 부수 효과로 통합 테스트의 검증이 정직해졌다.

```java
// Before
.body("type", is("https://roomescape.example/problems/not-found"))

// After
.body("type", is(ProblemType.NOT_FOUND.uri().toString()))
```

enum 값이 바뀌면 테스트가 *자동으로 따라간다*. 테스트가 표현(문자열) 대신 의도(enum)를 검증하는 셈이다.

### NOT_FOUND vs NO_RESOURCE, 같은 404를 두 개로 둔 이유

11개 ProblemType 중 두 개가 모두 *status 404*다. 처음엔 합칠까 했지만 *클라이언트가 받는 의미*가 다르다는 결론이 났다.

| ProblemType | 트리거 | 의미 |
|---|---|---|
| `NOT_FOUND` | `NotFoundException` (내가 throw) | 존재하지 않는 *식별자*. `예약 ID 7번을 찾을 수 없습니다` |
| `NO_RESOURCE` | `NoResourceFoundException` (Spring이 throw) | 잘못된 *경로*. `/reservations/foo/bar` 같은 매핑 없는 URL |

같은 status여도 클라이언트가 취해야 할 행동이 다르다. 전자는 *식별자를 확인*하라는 신호고, 후자는 *URL 자체를 확인*하라는 신호다. 그래서 type URI로 구분이 가능하도록 두 개로 둔다. RFC 9457이 `type`을 별도 필드로 둔 이유가 이런 경우라고 본다. status는 거친 분류, type은 정밀한 분류.

### buildProblem과 applyType, 두 헬퍼의 분담

위 두 경로의 공통 후처리를 한 곳에 모으려면 헬퍼가 적어도 두 개 필요했다.

```java
// 경로 A 전용. 내 도메인 예외에서 호출
private ProblemDetail buildProblem(
        HttpStatus status,
        ProblemType type,
        Exception ex,
        WebRequest request
) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, ex.getMessage());
    applyType(problem, type, request);
    logException(ex, status, request);
    return problem;
}

// 두 경로 공통. type/title/instance만 세팅
private void applyType(ProblemDetail problem, ProblemType type, WebRequest request) {
    problem.setType(type.uri());
    problem.setTitle(type.title());
    problem.setInstance(URI.create(extractUri(request)));
}

// 경로 B 전용. status에서 ProblemType으로 변환
private ProblemType mappingFor(Exception ex, HttpStatusCode status) {
    if (ex instanceof MethodArgumentNotValidException) {
        return ProblemType.VALIDATION_ERROR;
    }
    return switch (status.value()) {
        case 400 -> ProblemType.BAD_REQUEST;
        case 404 -> ProblemType.NO_RESOURCE;
        case 405 -> ProblemType.METHOD_NOT_SUPPORTED;
        case 406 -> ProblemType.NOT_ACCEPTABLE;
        case 415 -> ProblemType.MEDIA_TYPE_NOT_SUPPORTED;
        default -> ProblemType.INTERNAL_ERROR;
    };
}
```

핵심은 `applyType`이 *3 파라미터*라는 점이다. 직전 글의 `decorate(problem, ex, status, request)`는 4 파라미터였고, 내부에서 `mappingFor(ex, status)`를 직접 호출하면서 *type을 결정하는 일*과 *type을 세팅하는 일*을 동시에 했다. 두 일을 떼어내고 보니 *세팅 부분*은 두 경로가 똑같이 쓸 수 있는 진짜 공통 헬퍼였다.

`mappingFor`에서 `MethodArgumentNotValidException`만 `instanceof`로 빼낸 이유는, 같은 status 400이라도 `BAD_REQUEST`와 `VALIDATION_ERROR`가 클라이언트 의미가 다르기 때문이다. 위 NOT_FOUND vs NO_RESOURCE와 같은 결의 결정이다.

### handleUnexpected가 다섯 형제 중 인라인인 이유

다섯 개의 `@ExceptionHandler` 중 네 개는 `buildProblem` 한 줄로 끝난다.

```java
@ExceptionHandler(NotFoundException.class)
public ProblemDetail handleNotFound(NotFoundException ex, WebRequest request) {
    return buildProblem(HttpStatus.NOT_FOUND, ProblemType.NOT_FOUND, ex, request);
}

@ExceptionHandler(UnauthorizedException.class)
public ProblemDetail handleUnauthorized(UnauthorizedException ex, WebRequest request) {
    return buildProblem(HttpStatus.UNAUTHORIZED, ProblemType.UNAUTHORIZED, ex, request);
}

@ExceptionHandler(ConflictException.class)
public ProblemDetail handleConflict(ConflictException ex, WebRequest request) {
    return buildProblem(HttpStatus.CONFLICT, ProblemType.CONFLICT, ex, request);
}

@ExceptionHandler(BusinessRuleViolationException.class)
public ProblemDetail handleBusinessRuleViolation(BusinessRuleViolationException ex, WebRequest request) {
    return buildProblem(HttpStatus.UNPROCESSABLE_ENTITY, ProblemType.BUSINESS_RULE_VIOLATION, ex, request);
}
```

남은 하나, `handleUnexpected`만 헬퍼를 안 거치고 인라인으로 펼친다.

```java
@ExceptionHandler(Exception.class)
public ProblemDetail handleUnexpected(Exception ex, WebRequest request) {
    HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, DETAIL_INTERNAL_ERROR);
    applyType(problem, ProblemType.INTERNAL_ERROR, request);
    logException(ex, status, request);
    return problem;
}
```

이유는 *detail이 ex.getMessage()가 아닌 유일한 케이스*이기 때문이다. `buildProblem`은 `ex.getMessage()`를 그대로 detail로 박는다. 도메인 예외 메시지(`"예약 ID 7번을 찾을 수 없습니다"`)는 클라이언트에 보여도 좋은 메시지지만, 예상치 못한 `Exception`의 `getMessage()`는 다르다. `NullPointerException: Cannot invoke "Reservation.getName()" because "reservation" is null` 같은 내부 디테일이 그대로 새어 나간다.

선택지가 둘이었다.

```java
// 옵션 X. buildProblem에 detail 파라미터를 다시 추가
private ProblemDetail buildProblem(HttpStatus status, ProblemType type, String detail, Exception ex, WebRequest request) { ... }

// 옵션 Y. handleUnexpected만 인라인으로 펼침
```

옵션 X는 호출 5개 중 4개가 `ex.getMessage()`를 매번 *반복 전달*한다. 시그니처가 무거워지고, 진짜로 detail이 다른 한 마리는 그 5인자 호출 안에 묻힌다. 옵션 Y는 헬퍼는 *기본 케이스*만 받게 두고 *이상치*는 자기 자리에서 펼친다. 이상치임이 시각적으로 드러난다.

다섯 형제 중 한 명만 시그니처가 다른 게 *의도된* 결정이라는 신호로 둔다. 헬퍼의 매개변수 개수가 호출처의 반복으로 정해지면 그 헬퍼는 좋은 헬퍼가 아니다.

### 흐름 한 장으로

```
[경로 A]                            [경로 B]
RoomescapeException 5종              Spring 표준 ~20종
        ↓                                    ↓
  @ExceptionHandler                  ResponseEntityExceptionHandler
  핸들러 4개 → buildProblem            handleXxx() → handleExceptionInternal
  handleUnexpected → 인라인                    ↓
        ↓                            applyType(problem, mappingFor(ex, status), request)
   applyType + logException                   ↓
                                       logException
                  ↓                                  ↓
                  └────────── ProblemDetail ─────────┘
                              (RFC 9457)
```

진입점이 둘, 출구는 하나. 출구를 `applyType` 한 메서드로 좁혀둔 게 *공통 후처리*의 본체다.

### 다음에 같은 자리에서 쓸 룰

- ProblemDetail의 `type`과 `title`은 *짝*이다. 호출 시점에 두 문자열로 따로 받으면 둘이 어긋날 수 있다. enum이나 record에 묶어 *함께 다닌다*는 신호를 자료구조에 박는다.
- 같은 status여도 *클라이언트 의미*가 다르면 ProblemType을 둘로 둔다. 404 = NOT_FOUND vs NO_RESOURCE, 400 = BAD_REQUEST vs VALIDATION_ERROR. type URI가 그 분류를 담당한다.
- 헬퍼는 *기본 케이스*만 받는다. 이상치 한 마리 때문에 시그니처에 파라미터를 추가하면, 호출 다수가 그 파라미터를 *반복 전달*하면서 시그니처가 무거워진다. 이상치는 자기 자리에서 인라인으로 펼치는 게 정직하다.
- 통합 테스트의 type URI 검증은 매직 스트링 대신 `ProblemType.X.uri().toString()`을 직접 참조한다. enum이 바뀌면 테스트가 따라가도록 둔다. 같은 ProblemType이 여러 테스트에 걸치면 *대표 케이스 한 곳*만 검증해 표현에 과적합되지 않게 한다.
- 헬퍼가 두 종류 책임을 동시에 지면 *공통화*가 잘 안 보인다. type 결정(`mappingFor`)과 type 적용(`applyType`)을 떼어내고 보니, 진짜 공통 헬퍼가 무엇이었는지가 비로소 드러났다. 책임 하나당 메서드 하나가 *읽기 가독성*만이 아니라 *재사용 가능성*까지 가른다.
