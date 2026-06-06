---
title: "락 충돌은 503인가 409인가: RFC 9110으로 다시 읽은 상태 코드"
category: "web"
slug: "lock-conflict-409-vs-503"
num: 1
date: 2026-06-06
description: "방탈출 예약 대기 미션에서 예약 취소의 일시적 실패를 503으로 매핑했다. 락 대기나 동시성 충돌은 타이밍 때문에 실패한 것이니 다시 시도하라는 뜻이었다. 리뷰어가 TransientDataAccessException이 언제 발생하는지, RFC 9110 기준 503과 409 중 무엇이 맞는지 되물었다. 나는 4xx는 클라이언트 잘못, 5xx는 서버 잘못으로 알고 있었는데 락 충돌은 둘 중 어디에도 깔끔하게 들어맞지 않았다. Spring의 예외 계층과 RFC 9110을 따라가 보니, 4xx와 5xx를 가르는 건 누구의 잘못이냐가 아니라 막힌 범위가 서버 전체냐 그 리소스 하나냐였다. 503을 409로 바꾸면서 Retry-After라는 표준 신호를 포기하는 트레이드오프까지 정리한 기록이다."
tags: ["HTTP", "RFC 9110", "상태 코드", "Spring 예외 처리", "우테코"]
---

## 503으로 두었던 자리

방탈출 예약 대기 미션 2차에서 예약 취소가 실패하는 경우를 두 갈래로 나눴다. 하나는 지난 예약을 취소하려는 것 같은 비즈니스 규칙 위반이고, 다른 하나는 락 대기나 동시성 충돌 같은 일시적 DB 실패다. 앞쪽은 422에 위반한 규칙 메시지를 실어 보냈고, 뒤쪽은 503에 재시도 안내를 실었다. 503으로 둔 논리는 단순했다. 요청 자체가 잘못된 게 아니라 타이밍 때문에 실패한 것이니 "다시 시도하세요"가 맞다고 봤다.

핸들러는 이렇게 생겼었다.

```java
@ExceptionHandler(TransientDataAccessException.class)
public ProblemDetail handleTransient(TransientDataAccessException ex, WebRequest request) {
    HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, DETAIL_TRANSIENT);
    applyType(problem, ProblemType.SERVICE_UNAVAILABLE, request);
    logException(ex, status, request);
    return problem;
}
```

리뷰어는 이 503을 그냥 넘기지 않았다. 두 가지를 되물었다. 첫째, `TransientDataAccessException`이라는 한 묶음을 전부 503으로 신뢰해도 되는지 걸린다고 했는데 그럼 이 예외가 언제 발생하는지 학습해보면 어떻겠냐는 것. 둘째, RFC 9110에서 503은 서버 점검이나 과부하 같은 서버 전체 수준의 불가 상태이고 409는 요청이 리소스의 현재 상태와 충돌하는 코드인데, 락 충돌은 둘 중 무엇이 더 맞는지 한 번 더 생각해보라는 것이었다.

## 내 전제가 흔들린 자리

질문을 받고 막힌 건 코드가 아니라 내 머릿속 규칙이었다. 나는 상태 코드를 "4xx는 클라이언트 잘못, 5xx는 서버 잘못"으로 외우고 있었다. 그 틀로 락 충돌을 보면 둘 다 안 맞는다. 사용자가 무언가 잘못 누른 것도 아니고, 서버가 죽은 것도 아니다. 누구의 잘못도 아닌 실패를 어디로 보내야 하나. 게다가 503도 결국 "잠시 후 다시"라서, 409와 무엇이 다른지 처음에는 보이지 않았다.

순서대로 풀어야 했다. 먼저 이 예외가 정확히 무엇인지, 다음으로 4xx와 5xx를 가르는 진짜 기준이 무엇인지.

## TransientDataAccessException은 무엇을 모아둔 묶음인가

Spring의 Javadoc부터 봤다. `TransientDataAccessException`은 일시적이라고 분류되는 데이터 접근 예외 계층의 루트이고, 이전에 실패한 작업을 애플리케이션 레벨의 개입 없이 그대로 재시도하면 성공할 수 있는 경우를 가리킨다. 부모는 `DataAccessException`이다.

여기서 `DataAccessException` 아래가 재시도 가능성으로 두 갈래로 갈린다는 게 핵심이었다.

- `NonTransientDataAccessException`: 그대로 다시 보내도 똑같이 실패하는 것. 문법 오류(`BadSqlGrammarException`), 제약 위반(`DataIntegrityViolationException`, `DuplicateKeyException`) 등이 여기 있다.
- `TransientDataAccessException`: 변경 없이 재시도하면 성공할 수 있는 것. 락 충돌과 데드락(`ConcurrencyFailureException`), 쿼리 타임아웃(`QueryTimeoutException`), 일시적 리소스 실패(`TransientDataAccessResourceException`)가 모여 있다.

JDBC `SQLException`이 던져지면 Spring의 `SQLExceptionTranslator`가 SQLState나 벤더 에러 코드를 보고 적절한 예외로 번역한다. 락 타임아웃과 데드락은 보통 SQLState 40번대로 떨어져 `ConcurrencyFailureException` 쪽으로 간다. 내 테스트가 던지는 `CannotAcquireLockException`은 그 아래 `PessimisticLockingFailureException`에 속한다.

여기까지 보고 나서 내가 PR에 적어둔 걱정 하나가 풀렸다. 나는 "이 묶음을 전부 503으로 신뢰해도 되나, 재시도해도 의미 없는 게 섞여 있지 않을까"를 걱정했다. 답은 묶음의 정의 안에 이미 있었다. 재시도해도 의미 없는 것은 전부 `NonTransient` 쪽이고, `Transient`는 타이밍 때문에 실패했고 다시 하면 풀릴 수 있는 것만 모은 묶음이다. 한 핸들러로 잡아도 의미가 일관되는 이유였다.

## 4xx와 5xx는 "잘못"이 아니다

두 번째 질문, 503이냐 409냐로 가기 전에 내 전제부터 교정해야 했다. RFC 9110의 상태 코드 클래스 정의를 직접 읽었다. 4xx에 대해 RFC는 이렇게 쓴다.

> the client seems to have erred

"seems"라는 단어가 핵심이었다(RFC 9110 §15.5). "네 잘못이다"가 아니라 "요청 쪽에서 비롯된 것으로 보인다"는 뜻이다. 5xx는 서버가 자기 오류를 인지했거나 요청된 메서드를 수행할 능력이 없는 경우다(§15.6).

결정적인 반례가 409 그 자체였다. 두 사용자가 동시에 같은 리소스를 수정해 충돌하면 누구의 잘못도 아니지만 409가 나간다. 409가 4xx로 분류된 것은 상태 코드의 카테고리일 뿐, 클라이언트의 과실을 판정하는 게 아니다. "4xx는 클라이언트 잘못"은 대체로 통하는 어림짐작이지만, 동시성 충돌 같은 회색지대에서 깨진다.

그래서 더 쓸모 있는 질문은 "누구 잘못이냐"가 아니라 "어느 쪽이 이 상황을 풀 수 있느냐, 무엇이 막고 있느냐"였다.

## 503과 409의 진짜 차이는 범위다

여기서 한 번 더 막혔다. 503도 "잠시 후 재시도하면 풀린다"는 의미를 담는다. Retry-After를 주는 코드가 바로 503이다. 그러니 "재시도하면 풀리느냐"는 둘을 가르는 기준이 못 된다. 둘 다 그렇다.

가르는 축은 따로 있었다. 문제가 막고 있는 범위다.

| | 503 | 409 |
|---|---|---|
| 문제의 범위 | 서버 인스턴스 전체 | 이 리소스 하나 |
| 서버 상태 | 지금 아무 요청도 못 받음 | 멀쩡함, 다른 요청은 처리됨 |
| 재시도하면 | 풀림(서버 회복 후) | 풀림(충돌 해소 후) |
| 재시도 타이밍 | 서버가 정함 | 보통 즉시 |
| RFC 9110 위치 | §15.6.4 | §15.5.10 |

503은 서버가 일시적 과부하나 예정된 점검으로 지금 요청을 처리할 수 없는 상태다(§15.6.4). 정의에 "서버 전체"라는 범위가 박혀 있다. 409는 요청이 대상 리소스의 현재 상태와 충돌해 완료될 수 없는 경우이고, 사용자가 충돌을 해소하고 재요청할 수 있는 상황에 쓴다(§15.5.10).

식당으로 바꿔 보면 차이가 분명해진다. 503은 가게가 "브레이크타임이라 지금 입장 불가, 30분 뒤 오세요"라고 하는 것이다. 가게 전체 사정이라 무엇을 주문하려 했든 아무도 못 들어간다. 409는 가게는 정상 영업 중인데 내가 앉으려는 그 테이블 하나에 마침 다른 손님이 동시에 앉으려는 것이다. 가게는 멀쩡하고, 그 자리의 경합만 정리되면 바로 앉는다.

락 충돌은 명백히 후자였다. 서버는 다른 예약과 테마 요청을 다 처리하고 있고, 단지 이 예약 행 하나에 두 트랜잭션이 부딪혔다. 범위가 리소스다. "서버 전체 불가"인 503은 의미가 과하고, "이 리소스의 상태 충돌"인 409가 범위에 맞았다.

## 409로 가면 Retry-After를 잃는다

여기서 끝내면 한쪽만 본 것이다. 503을 포기하면 잃는 게 있었다. Retry-After 헤더다.

Retry-After의 정의(RFC 9110 §10.2.3)는 이 헤더가 짝지을 응답을 지정한다. 503과 3xx 리다이렉트, 그리고 RFC 6585의 429다. 409는 목록에 없다. 거꾸로 503의 정의 안에도 서버가 Retry-After 헤더를 보낼 수 있다는 문장이 들어 있다. 503과 Retry-After는 RFC 차원에서 서로를 가리키는 한 쌍이었다.

그래서 락 충돌을 503으로 두면 `Retry-After: 1` 같은 헤더로 "1초 뒤 다시"를 기계가 읽을 수 있게 줄 수 있다. 409로 옮기면 그 표준 수단을 잃는다. 재시도 안내를 헤더가 아니라 응답 본문의 detail 메시지로 줄 수밖에 없다. 정리하면 양쪽의 거래는 이렇다.

- 503의 이점: Retry-After라는 표준 재시도 신호를 정식으로 붙일 수 있다.
- 503의 비용: "서버 전체 불가"라는 의미 과잉, 그리고 5xx로 집계되어 멀쩡한 서버가 장애로 잡히는 오탐.
- 409의 이점: "리소스 충돌"이라는 의미가 정확하고, 4xx 정상 범주로 집계된다.
- 409의 비용: Retry-After의 표준 짝이 아니라 재시도 안내를 본문으로 줘야 한다.

나는 의미의 정확성과 집계 정상화를 더 무겁게 보고 409를 택했다. 재시도 안내는 detail 메시지로 유지했다.

## 코드로 옮기기

판단을 코드에 반영하면서 한 가지가 더 걸렸다. 기존에 409를 쓰던 자리가 이미 있었다. 중복 예약 같은 비즈니스 충돌을 `ConflictException`이 409로 내보내고 있었다. 락 충돌도 409로 보내면 같은 상태 코드를 성격이 반대인 둘이 공유하게 된다.

- 기존 `conflict`: 이미 그 상태라서 충돌. 재시도해도 같은 결과다(영속적).
- 신규 동시성 충돌: 지금 다른 트랜잭션과 부딪혀서 충돌. 재시도하면 풀린다(일시적).

상태 코드는 409로 통일하되, RFC 9457 ProblemDetail의 `type`으로 둘을 구분하기로 했다. `ProblemType`에 항목을 하나 신설했다.

```java
CONFLICT("conflict", "요청이 현재 상태와 충돌함"),
CONCURRENCY_CONFLICT("concurrency-conflict", "동시 요청이 충돌함"),
```

핸들러는 상태 코드와 type만 바뀌고 재시도 안내 detail은 그대로 뒀다.

```java
@ExceptionHandler(TransientDataAccessException.class)
public ProblemDetail handleTransient(TransientDataAccessException ex, WebRequest request) {
    HttpStatus status = HttpStatus.CONFLICT;
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, DETAIL_TRANSIENT);
    applyType(problem, ProblemType.CONCURRENCY_CONFLICT, request);
    logException(ex, status, request);
    return problem;
}
```

부수효과가 하나 따라왔다. 로그 레벨이 바뀌었다. 핸들러는 5xx면 error, 그 외면 warn으로 찍는다. 503일 때 error로 남던 락 충돌이 409가 되며 warn으로 내려갔다. 락 충돌은 서버 에러가 아니니 이게 더 맞는 자리였다.

테스트는 `CannotAcquireLockException`을 주입해 기대 응답을 409와 새 type으로 맞췄다.

```java
mockMvc.perform(delete("/reservations/me/{id}", reservationId).param("name", "티뉴"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value(ProblemType.CONCURRENCY_CONFLICT.uri().toString()));
```

## 정리

- 4xx와 5xx를 가르는 건 "누구 잘못이냐"가 아니라 "막힌 범위가 서버 전체냐 그 리소스냐"다. 409가 그 증거다. 누구의 잘못도 아닌 동시성 충돌이 4xx에 있다.
- `TransientDataAccessException`은 재시도하면 풀릴 수 있는 것만 모은 묶음이다. "전부 503으로 신뢰해도 되나"의 답은 묶음의 정의 안에 있었다.
- 503과 409의 변별은 재시도 가능 여부가 아니라 범위다. 락 충돌은 서버가 멀쩡한 채 리소스만 충돌한 것이라 409다.
- 같은 409라도 영속적 충돌과 일시적 충돌은 성격이 반대라, 상태 코드는 통일하고 ProblemDetail type으로 구분했다.
- 409로 옮기면 Retry-After라는 503의 표준 신호를 포기한다. 상태 코드를 바꾸는 일에는 잃는 것도 같이 따라온다.

## 다음에 상태 코드를 고를 때의 룰

- "누구 잘못이냐"로 먼저 가르지 않는다. "무엇이 막고 있나"와 "누가 어떻게 푸나"를 먼저 본다.
- 일시적 실패를 5xx로 두기 전에, 서버 전체가 불가한 상황인지 그 리소스만 충돌인지 묻는다.
- 같은 상태 코드를 여러 사유가 공유하면 ProblemDetail의 type으로 가를 수 있는지 본다.

마지막으로 남겨둔 질문이 하나 있다. 사실 가장 사용자 친화적인 해법은 상태 코드 선택이 아닐 수 있다. 락 충돌은 재시도하면 풀리는 것이라, 서버가 한두 번 자동으로 재시도해 충돌을 사용자에게 아예 안 보이게 하거나, 취소와 대기 승계를 분리해 충돌이 생기는 지점 자체를 없애는 쪽이 더 근본적일 수 있다. 그건 상태 코드 너머의 설계 질문이라 다음으로 미뤄둔다.
