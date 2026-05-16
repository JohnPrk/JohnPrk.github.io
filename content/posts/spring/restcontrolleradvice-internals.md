---
title: "@RestControllerAdvice 한 줄을 더 들여다봤다, @ResponseBody와 빈 등록까지"
category: "spring"
slug: "restcontrolleradvice-internals"
num: 4
date: 2026-05-16
description: "전역 예외 처리 클래스 맨 위에 무의식적으로 붙이던 @RestControllerAdvice. ResponseEntityExceptionHandler 글을 정리하다가 \"이 어노테이션이 정확히 무슨 일을 하지\"라는 질문이 남았다. @ControllerAdvice의 등장 배경, @RestControllerAdvice가 한 줄 더 가진 의미, @ResponseBody가 내부에서 하는 일, 그리고 @Component를 안 붙였는데 빈으로 등록되는 메커니즘까지 따라간 노트."
tags: ["스프링", "예외 처리", "@ControllerAdvice", "@ResponseBody", "Bean 등록", "우테코"]
---

### 시작점, 한 줄 어노테이션이 묶고 있는 일

[직전 글](/spring/response-entity-exception-handler-extension)을 쓰면서 `GlobalExceptionHandler` 클래스 위에 붙이는 어노테이션을 다시 봤다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
```

`@RestControllerAdvice`는 사이클1부터 관례적으로 붙여왔지만, 정확히 무슨 일을 하는 어노테이션인지 설명하라고 하면 두루뭉술했다. `@ControllerAdvice`는 어렴풋이 알지만 `@RestControllerAdvice`는 처음 짚어보는 거였다. 그래서 한 줄짜리 정의 파일까지 거슬러 올라가 정리했다.

### 발견, @ControllerAdvice가 등장한 자리

Spring 3.2 (2012) 이전에는 `@ExceptionHandler`를 *컨트롤러 클래스 내부*에 박았다.

```java
@Controller
public class ReservationController {
    @ExceptionHandler(NotFoundException.class)
    public String handleNotFound(...) { ... }
}

@Controller
public class ThemeController {
    @ExceptionHandler(NotFoundException.class)
    public String handleNotFound(...) { ... }   // 또 박음
}
```

같은 예외에 대해 같은 처리를 하고 싶은데도 컨트롤러마다 복붙해야 했다. 횡단 관심사인 예외 처리가 종(縱)인 클래스 계층에 종속돼 있는 셈이다.

Spring 3.2의 `@ControllerAdvice`로 이걸 한 클래스에 모을 수 있게 됐다. Javadoc은 이 어노테이션의 역할을 이렇게 적고 있다.

> Specialization of `@Component` for classes that declare `@ExceptionHandler`, `@InitBinder`, or `@ModelAttribute` methods to be shared across multiple `@Controller` classes.

`@ControllerAdvice`가 모을 수 있는 부가 로직은 세 종류다.

| 어노테이션 | 역할 |
|---|---|
| `@ExceptionHandler` | 예외 발생 시 동작 |
| `@InitBinder` | 요청 파라미터 바인딩 규칙 전역 설정 |
| `@ModelAttribute` | 모든 응답 모델에 공통 속성 주입 |

적용 대상을 좁히는 옵션도 있다.

```java
@ControllerAdvice(basePackages = "roomescape.admin")
@ControllerAdvice(assignableTypes = ReservationController.class)
@ControllerAdvice(annotations = RestController.class)
```

옵션을 안 주면 전역이다.

### @RestControllerAdvice의 한 줄 차이

Spring 4.3 (2016)에서 추가된 어노테이션 정의 자체를 보면 한 줄이다.

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@ControllerAdvice
@ResponseBody
public @interface RestControllerAdvice { ... }
```

`@RestControllerAdvice = @ControllerAdvice + @ResponseBody`. `@RestController = @Controller + @ResponseBody`와 정확히 같은 합성이다.

왜 따로 둘이 필요한가. `@ControllerAdvice`만 붙이면 `@ExceptionHandler` 메서드의 반환값을 Spring이 *뷰 이름*으로 해석한다.

```java
@ControllerAdvice   // @ResponseBody 없음
public class WrongConfig {
    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handle(...) {
        return problemDetail;
        // Spring 해석: "ProblemDetail.toString()이라는 뷰를 찾아라"
        // → ViewResolver가 못 찾음, 응답 깨짐
    }
}

@RestControllerAdvice   // @ResponseBody 자동 적용
public class RightConfig {
    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handle(...) {
        return problemDetail;
        // Spring 해석: "JSON으로 직렬화해 body로 써라"
    }
}
```

REST API라면 무조건 `@RestControllerAdvice`를 쓰면 되는 이유다.

### @ResponseBody가 내부에서 하는 일

`@ResponseBody`는 단순한 마커가 아니다. 붙는 순간 Spring MVC의 *반환값 처리 경로*가 바뀐다.

일반 흐름은 이렇다.

```
컨트롤러 반환값
  → DispatcherServlet
  → ViewResolver가 뷰 이름으로 해석
  → View가 모델을 렌더링
  → HTML 응답
```

`@ResponseBody` 흐름은 이렇다.

```
컨트롤러 반환값
  → RequestResponseBodyMethodProcessor가 잡음
  → Content Negotiation (요청 Accept 헤더 기준)
  → 적합한 HttpMessageConverter 선택
  → converter가 반환값을 직렬화 (JSON, XML, byte[] 등)
  → 응답 body로 write
  → ViewResolver는 거치지 않음
```

핵심 컴포넌트가 두 개 등장한다.

**RequestResponseBodyMethodProcessor.** `HandlerMethodReturnValueHandler` 중 하나로, 메서드 혹은 클래스에 `@ResponseBody`가 붙어 있는지를 검사하고 처리를 떠맡는다.

```java
public boolean supportsReturnType(MethodParameter returnType) {
    return AnnotatedElementUtils.hasAnnotation(returnType.getContainingClass(), ResponseBody.class)
        || returnType.hasMethodAnnotation(ResponseBody.class);
}
```

클래스 레벨이든 메서드 레벨이든 어디 붙어도 잡히는 이유가 여기 있다. `@RestController`나 `@RestControllerAdvice`가 *클래스 전체*에 효과를 미치는 것도 이 검사 덕분이다.

**HttpMessageConverter 체인.** 실제 직렬화를 담당한다. 기본 등록 목록의 일부.

- `ByteArrayHttpMessageConverter` (byte[])
- `StringHttpMessageConverter` (String)
- `MappingJackson2HttpMessageConverter` (JSON)
- `ResourceHttpMessageConverter` (Resource)

Content Negotiation으로 적합한 converter를 고른다. 요청 `Accept`가 `application/json`이면 Jackson converter, `text/plain`이면 String converter가 매칭된다.

`ProblemDetail` 객체를 반환하는 내 코드의 경우 흐름이 이렇게 된다.

```
컨트롤러가 ProblemDetail 반환
  → RequestResponseBodyMethodProcessor가 처리
  → Accept: application/problem+json (또는 application/json)
  → MappingJackson2HttpMessageConverter가 JSON 직렬화
  → 응답 Content-Type: application/problem+json 자동 설정
```

응답에 `Content-Type: application/problem+json`이 자동으로 붙는 이유는 Spring 6의 `ProblemDetail` 타입에 대해 framework가 *기본 미디어 타입*을 등록해뒀기 때문이다. 별도 설정 없이도 RFC 9457을 따르는 응답이 나간다.

### @Component가 없는데 빈으로 등록되는 미스터리

내 `GlobalExceptionHandler` 클래스 위에는 `@RestControllerAdvice` 외엔 아무 어노테이션도 없다. `@Component`도 안 붙였다. 그런데 Spring 컨테이너는 이걸 빈으로 인식한다. 이유는 두 단계에 걸쳐 있었다.

**1. 메타 어노테이션.** `@ControllerAdvice`의 정의를 까보면 이렇다.

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component   // ← 메타 어노테이션으로 박혀 있음
public @interface ControllerAdvice { ... }
```

`@Component`가 메타 어노테이션으로 들어 있다. Spring의 컴포넌트 스캐너는 클래스에 붙은 어노테이션을 검사할 때 `AnnotatedElementUtils.findMergedAnnotation()`을 통해 *어노테이션의 어노테이션까지 재귀 탐색*한다. 그래서 `@ControllerAdvice` 혹은 `@RestControllerAdvice`가 붙은 클래스도 컴포넌트로 인식돼 빈 등록된다.

같은 원리로 동작하는 친구들이 많다. `@Service`, `@Repository`, `@Controller`, `@RestController`, `@Configuration` 모두 `@Component`를 메타로 가진다.

**2. ControllerAdviceBean.findAnnotatedBeans()로의 별도 수집.** 빈으로 등록만 된다고 advice로 작동하는 건 아니다. 누가 *@ControllerAdvice 빈만 골라서* advice로 쓸지 결정해야 한다.

`ExceptionHandlerExceptionResolver`가 초기화 시점에 이 역할을 한다.

```java
@Override
public void afterPropertiesSet() {
    initExceptionHandlerAdviceCache();
    // ...
}

private void initExceptionHandlerAdviceCache() {
    List<ControllerAdviceBean> adviceBeans =
        ControllerAdviceBean.findAnnotatedBeans(getApplicationContext());

    for (ControllerAdviceBean adviceBean : adviceBeans) {
        Class<?> beanType = adviceBean.getBeanType();
        ExceptionHandlerMethodResolver resolver = new ExceptionHandlerMethodResolver(beanType);
        if (resolver.hasExceptionMappings()) {
            this.exceptionHandlerAdviceCache.put(adviceBean, resolver);
        }
    }
}
```

`ControllerAdviceBean.findAnnotatedBeans(context)`가 ApplicationContext에서 *@ControllerAdvice가 붙은 모든 빈*을 찾아 `ControllerAdviceBean`으로 래핑한다. 이 과정에서 `@Order` 우선순위, `basePackages`/`assignableTypes`/`annotations` 필터를 모두 분석한다.

이어서 각 advice 빈의 `@ExceptionHandler` 메서드들을 `ExceptionHandlerMethodResolver`로 추출, *예외 타입에서 메서드로의 매핑 캐시*를 만든다.

이 모든 일이 *애플리케이션 시작 시 한 번* 일어난다. 런타임에 예외가 발생할 때는 캐시 룩업만 일어나서 빠르다.

### 정리

`@RestControllerAdvice` 한 줄 안에서 동시에 일어나는 일.

1. `@ControllerAdvice` 부분, 메타로 박힌 `@Component` 덕분에 빈 등록. 그리고 `ExceptionHandlerExceptionResolver`가 시작 시 *advice 빈으로 별도 수집*해 예외 매핑 캐시를 만든다.
2. `@ResponseBody` 부분, 반환값을 ViewResolver 대신 `HttpMessageConverter`로 보내 JSON 직렬화. `ProblemDetail`은 자동으로 `application/problem+json`으로 나간다.

`@ControllerAdvice`와 `@RestControllerAdvice`의 차이는 *관례가 아니라 동작*에 있다. REST API에서는 두 가지 동작이 동시에 필요하기 때문에 `@RestControllerAdvice`가 정답이다.

### 다음에 같은 자리에서 쓸 룰

- REST API의 전역 예외 처리에는 `@RestControllerAdvice`를 쓴다. `@ControllerAdvice`만 붙이면 `ProblemDetail` 반환이 *뷰 이름으로 해석*돼 응답이 깨진다.
- "어떤 어노테이션이 빈으로 등록되는가"가 헷갈리면 정의 파일을 열어 *메타 어노테이션*을 본다. `@Component`가 메타로 박혀 있는 어노테이션은 모두 컴포넌트 스캔 대상이다.
- `@ControllerAdvice`는 *빈 등록* 단계와 *advice 수집* 단계 두 가지가 다 있어야 작동한다. 컴포넌트 스캔에서 빠지거나, `ExceptionHandlerExceptionResolver`가 작동하지 않으면 advice가 안 먹는다. 디버깅 시 두 지점을 모두 확인한다.
