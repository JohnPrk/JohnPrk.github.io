---
title: "@ExceptionHandler가 항상 가장 먼저 잡는 이유, HandlerExceptionResolver 체인까지 따라가보고"
category: "spring"
slug: "handler-exception-resolver-chain"
num: 6
date: 2026-05-16
description: "@ExceptionHandler는 어떻게 컨트롤러 예외를 잡는가. @ControllerAdvice의 핸들러와 컨트롤러 내부 핸들러 중 어느 쪽이 우선인가. @ResponseStatus와 @ExceptionHandler가 같은 예외에 걸리면 누가 이기는가. DispatcherServlet의 예외 처리 진입점부터 HandlerExceptionResolver 체인까지, 예외가 던져진 순간 Spring 내부에서 무슨 일이 일어나는지 따라간 노트."
tags: ["스프링", "예외 처리", "DispatcherServlet", "HandlerExceptionResolver"]
---

### 시작점, 우선순위가 보이지 않았다

[ResponseEntityExceptionHandler 글](/spring/response-entity-exception-handler-extension)을 정리하면서 한 가지가 명쾌하지 않았다. *왜 내 `@ExceptionHandler`가 Spring 표준 처리보다 먼저 잡는 걸까*. `@ResponseStatus`가 붙은 예외와 `@ExceptionHandler`가 같은 예외에 걸리면 누가 이기는 걸까. `ResponseEntityExceptionHandler`를 상속하면 왜 `DefaultHandlerExceptionResolver`가 호출되지 않는 걸까.

답을 잡으려면 DispatcherServlet이 예외를 받은 순간부터 응답이 결정되기까지의 경로를 따라가야 했다.

### 발견, DispatcherServlet의 예외 처리 진입점

요청 처리 메인 흐름은 `DispatcherServlet.doDispatch()` 안에 있다. 간략화한 모습.

```java
try {
    mv = ha.handle(processedRequest, response, mappedHandler.getHandler());
} catch (Exception ex) {
    dispatchException = ex;
}
processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
```

컨트롤러에서 예외가 던져지면 `dispatchException`에 잡혀 `processDispatchResult`로 넘어간다.

```java
// processDispatchResult 내부
if (exception != null) {
    mv = processHandlerException(request, response, handler, exception);
}
```

`processHandlerException`이 *예외 처리의 시작점*이다.

```java
// processHandlerException 내부 (간략화)
for (HandlerExceptionResolver resolver : this.handlerExceptionResolvers) {
    ModelAndView mv = resolver.resolveException(request, response, handler, ex);
    if (mv != null) {
        return mv;   // 처리 완료
    }
}
// 모든 resolver가 null 반환 → 위로 throw → 서블릿 컨테이너의 에러 페이지
```

핵심은 `handlerExceptionResolvers`가 *리스트*라는 것. 순서대로 시도하고, 누군가 `null`이 아닌 `ModelAndView`를 반환하면 처리 완료, `null`이면 다음 resolver로 넘어간다. *체인 책임 패턴*이다.

### 원리, 기본 체인의 세 멤버

Spring Boot 기본 설정에서 등록되는 resolver들. 순서대로.

| 순서 | Resolver | 역할 |
|---|---|---|
| 1 | `ExceptionHandlerExceptionResolver` | `@ExceptionHandler` 메서드 호출 |
| 2 | `ResponseStatusExceptionResolver` | `@ResponseStatus` 어노테이션 처리 |
| 3 | `DefaultHandlerExceptionResolver` | Spring MVC 표준 예외 fallback |

순서는 어떻게 결정되는가. 각 resolver는 `Ordered` 인터페이스를 구현하고, 우선순위 값이 박혀 있다.

```java
ExceptionHandlerExceptionResolver:  Ordered.LOWEST_PRECEDENCE - 2   // 가장 먼저
ResponseStatusExceptionResolver:    Ordered.LOWEST_PRECEDENCE - 1
DefaultHandlerExceptionResolver:    Ordered.LOWEST_PRECEDENCE       // 마지막
```

`LOWEST_PRECEDENCE`는 `Integer.MAX_VALUE`다. 숫자가 작을수록 먼저 실행된다.

`WebMvcConfigurationSupport`가 세 resolver를 모아 `AnnotationAwareOrderComparator`로 정렬한 뒤 `HandlerExceptionResolverComposite`에 넣는다. 이게 **`@ExceptionHandler`가 항상 가장 먼저 잡는 이유**다. 사용자 정의 예외 처리가 표준 처리보다 우선되도록 의도된 설계다.

### 각 resolver가 하는 일

**1. ExceptionHandlerExceptionResolver**

가장 먼저 호출된다. 내부 흐름은 이렇다.

```
1. 발생한 예외 ex 받음
2. 먼저 컨트롤러 *내부*의 @ExceptionHandler 검사 (있으면 우선)
3. 없으면 캐시된 @ControllerAdvice 빈들의 @ExceptionHandler 룩업
4. 예외 클래스에 가장 가까운 매칭 찾음
   (예: NotFoundException → 못 찾으면 부모 클래스 순회)
5. 매칭된 핸들러 메서드 호출
6. 반환값을 ModelAndView 또는 ResponseBody로 변환
7. 매칭 안 됨 → null 반환 → 다음 resolver로
```

특히 2번과 3번의 순서가 중요하다. *컨트롤러 내부*에 박힌 `@ExceptionHandler`가 *전역* `@ControllerAdvice`보다 *항상 우선*이다. 특정 컨트롤러에서만 특별 처리하고 싶을 때 활용할 수 있다.

내가 작성한 `extends ResponseEntityExceptionHandler` 클래스의 핸들러들도 모두 이 resolver가 잡는다. 부모 클래스가 제공한 `@ExceptionHandler`도 *상속받은 어노테이션*으로 인식되기 때문이다.

**2. ResponseStatusExceptionResolver**

예외 클래스 자체에 `@ResponseStatus`가 붙은 경우를 처리한다.

```java
@ResponseStatus(value = HttpStatus.NOT_FOUND, reason = "Order not found")
public class OrderNotFoundException extends RuntimeException { ... }
```

이 예외가 던져지면 resolver가 `response.sendError(404, "Order not found")`를 호출한다. 다만 이건 *body 없는* 단순 응답이다. ProblemDetail 같은 정밀한 응답이 필요하면 `@ExceptionHandler`로 잡는 게 낫다.

Spring 5+에서 추가된 `ResponseStatusException`도 여기서 처리된다.

```java
throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found", null);
```

**3. DefaultHandlerExceptionResolver**

Spring MVC가 내부적으로 던지는 표준 예외(`HttpRequestMethodNotSupportedException`, `HttpMediaTypeNotSupportedException`, `MissingServletRequestParameterException` 등)에 대해 *적절한 상태 코드만* 설정하는 fallback. body는 빈 채로 둔다.

여기까지 도달했다는 건 위 두 resolver가 못 잡았다는 뜻이다.

### Spring 6 이후의 큰 변화

Spring 6에서 `ResponseEntityExceptionHandler`가 강화되면서 흐름이 또 한 번 바뀌었다. 이 추상 클래스를 상속한 `@RestControllerAdvice`를 두면, 클래스가 MVC 표준 예외들을 *상속받은 @ExceptionHandler로 미리 등록*해버린다. 그래서 흐름이 이렇게 된다.

```
HttpRequestMethodNotSupportedException 발생
  → ExceptionHandlerExceptionResolver가 잡음
    → @RestControllerAdvice의 (상속받은) @ExceptionHandler 매칭
    → handleHttpRequestMethodNotSupported() 호출
    → handleExceptionInternal()로 ProblemDetail body 생성
  → ModelAndView 반환 → 처리 완료
DefaultHandlerExceptionResolver는 호출되지 않음
```

즉 *Spring 5까지는* MVC 표준 예외가 `DefaultHandlerExceptionResolver`에서 마무리됐지만, *Spring 6 이후* `ResponseEntityExceptionHandler` 상속 패턴을 쓰면 첫 번째 resolver에서 끝난다. `DefaultHandlerExceptionResolver`는 사실상 *상속을 안 하는 옛 스타일*을 위한 fallback으로 남는 셈이다.

내가 사이클2에서 `extends ResponseEntityExceptionHandler`로 전환했을 때 응답이 풍부해진 이유도 여기 있다. 똑같은 표준 예외인데, 잡는 *주체*가 1번 resolver로 옮겨지면서 ProblemDetail body가 같이 나가게 된 것.

### 핸들러 우선순위 다섯 단계

같은 예외가 여러 곳에서 잡힐 수 있을 때 결정되는 우선순위를 정리하면 이렇다.

1. **컨트롤러 내부의 `@ExceptionHandler`** (가장 우선)
2. **`@ControllerAdvice` 빈의 `@ExceptionHandler`** (여러 개면 `@Order`로 결정)
3. **예외 클래스의 `@ResponseStatus`**
4. **MVC 표준 예외에 대한 `DefaultHandlerExceptionResolver`의 매핑** (Spring 6에서는 2번에 흡수되는 경향)
5. 아무도 못 잡음 → 서블릿 컨테이너의 기본 에러 페이지

### 체인 커스터마이징

기존 체인에 끼워 넣고 싶을 때.

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void extendHandlerExceptionResolvers(List<HandlerExceptionResolver> resolvers) {
        resolvers.add(0, new MyCustomResolver());   // 맨 앞에 끼움
    }
}
```

`extend`는 기본 셋을 유지하면서 추가한다. 반면 `configureHandlerExceptionResolvers`는 전체를 교체하는데, 기본 셋이 빠지면 표준 예외 처리가 망가지므로 거의 쓸 일이 없다.

### 정리, 한 문장으로

Spring MVC의 예외 처리는 *체인 책임 패턴*이다. DispatcherServlet은 예외 발생 시 `HandlerExceptionResolver` 리스트를 순서대로 시도하고, 첫 번째로 *ModelAndView를 반환*하는 resolver가 처리를 가져간다.

순서는 `Ordered` 인터페이스의 값으로 결정되고, `ExceptionHandlerExceptionResolver`가 가장 우선이라서 `@ExceptionHandler`는 *항상* 표준 처리보다 먼저 잡는다.

Spring 6 이후 `ResponseEntityExceptionHandler` 상속 패턴이 표준이 되면서, MVC 표준 예외도 첫 번째 resolver 안에서 풍부한 응답(ProblemDetail body 포함)으로 처리되는 흐름으로 옮겨가고 있다.

### 다음에 같은 자리에서 쓸 룰

- `@ExceptionHandler`가 안 먹는다고 느끼면 *우선순위 다섯 단계* 중 어디서 잡히고 있는지부터 본다. 컨트롤러 내부 핸들러가 있으면 그게 이기고, 그다음이 `@ControllerAdvice`다.
- `@ResponseStatus`와 `@ExceptionHandler`가 둘 다 적용 가능하면 `@ExceptionHandler`가 이긴다. 두 방식을 같은 예외에 동시에 쓰면 헷갈리니 하나만 쓴다.
- Spring 5에서 6으로 마이그레이션할 때, 이전엔 `DefaultHandlerExceptionResolver`가 잡던 MVC 표준 예외가 `extends ResponseEntityExceptionHandler` 도입 후 *내 @RestControllerAdvice*가 잡게 된다. 응답 형태가 바뀌므로 회귀 테스트를 박아둔다.
- 체인을 손볼 일이 생기면 `extendHandlerExceptionResolvers`로 추가만 한다. `configureHandlerExceptionResolvers`는 기본 셋을 전부 날리니까 쓸 일이 거의 없다.
