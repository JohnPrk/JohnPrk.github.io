---
title: "WebMvcConfigurer는 왜 이렇게 생겼나: MVC 설정을 통째로 갖지 않고 일부만 얹는 법"
category: "spring"
slug: "webmvcconfigurer-extension-callback"
num: 15
date: 2026-06-01
description: "리뷰어가 WebConfig를 가리키며 이 클래스의 역할이 무엇이고 WebMvcConfigurer가 무엇이냐고 물었다. 내 WebConfig는 화면 매핑 한 메서드뿐이라 정적 화면 라우팅 설정이라고 답하려 했는데, 그러면 왜 그게 인터페이스인지, 왜 인터셉터와 아규먼트 리졸버까지 같은 인터페이스 한 곳에 들어가는지가 설명되지 않았다. WebMvcConfigurer의 Javadoc과 스프링 부트의 자동설정 관계를 따라가니, 이건 거대한 MVC 설정 전체를 상속해 갈아엎지 않고 정해진 자리에 일부만 얹게 해주는 확장 콜백이었다. 요청 파이프라인 위에서 각 메서드가 어디에 끼는지로 구조를 다시 본 기록이다."
tags: ["스프링", "Spring MVC", "WebMvcConfigurer", "DispatcherServlet", "우테코"]
---

### 시작점: 리뷰어가 WebConfig의 역할을 물었다

우테코 방탈출 미션 PR에서 리뷰어가 `WebConfig`를 가리키며 두 가지를 물었다.

> 이 클래스는 어떤 역할을 하나요?
> WebMvcConfigurer는 어떤건가요~?

그때 내 `WebConfig`는 이게 전부였다.

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("index");
        registry.addViewController("/reservation").setViewName("reservation");
        registry.addViewController("/my").setViewName("my-reservation");
        registry.addViewController("/admin").setViewName("admin/index");
        // ...
    }
}
```

`/`, `/reservation`, `/admin` 같은 URL을 화면 이름에 연결하는 게 전부다. 그래서 "로직 없는 정적 화면을 컨트롤러 없이 라우팅하는 설정"이라고 답하면 *첫 번째 질문*은 닫힌다.

문제는 두 번째 질문이었다. `WebMvcConfigurer`가 무엇이냐. "그 화면 매핑을 등록하려고 구현하는 인터페이스"라고 답하면 동어반복이다. 왜 *인터페이스*인지, 왜 화면 매핑 같은 게 거기 들어가는지가 설명되지 않았다.

### 발견: 같은 인터페이스에 성격이 다른 것들이 들어간다

다음 미션(인증)의 `WebConfig`를 보니 같은 인터페이스를 구현하는데 메서드가 셋이었다.

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    // ... 생성자로 인터셉터, 리졸버 주입 ...

    @Override
    public void addViewControllers(ViewControllerRegistry registry) { /* 화면 매핑 */ }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminInterceptor).addPathPatterns("/admin/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(loginMemberArgumentResolver);
    }
}
```

세 메서드의 성격이 제각각이다. `addViewControllers`는 URL과 화면을 잇고, `addInterceptors`는 요청을 가로채 권한을 검사하고, `addArgumentResolvers`는 컨트롤러 메서드의 파라미터를 채운다. 화면 라우팅과 권한 검사와 파라미터 주입은 전혀 다른 일인데, *왜 한 인터페이스에 같이 들어가 있나.* 여기서 의문이 생겼다. 이 인터페이스의 정체를 알아야 답이 나오겠다고 봤다.

### 원리: WebMvcConfigurer는 무엇을 위해 만들어졌나

`WebMvcConfigurer`의 Javadoc 첫 문장은 이렇게 시작한다.

> Defines callback methods to customize the Java-based configuration for Spring MVC enabled via @EnableWebMvc.

`@EnableWebMvc`로 켜지는 Spring MVC 설정을 *커스터마이즈하는 콜백 메서드의 모음*이라는 것이다. 두 단어가 핵심이다. **콜백**, 그리고 **`@EnableWebMvc`로 켜지는 설정**.

먼저 "`@EnableWebMvc`로 켜지는 설정"이 무엇인지부터다. Spring MVC의 설정 본체는 `WebMvcConfigurationSupport`라는 거대한 클래스다. 핸들러 매핑, 메시지 컨버터, 아규먼트 리졸버, 예외 처리기 같은 MVC의 기본 부품이 전부 여기서 만들어진다. `@EnableWebMvc`를 붙이면 이 본체가 통째로 들어온다.

문제는 이 본체를 *내가 조금 손보고 싶을 때*다. 인터셉터 하나 끼우겠다고 이 거대한 클래스를 상속해 메서드를 오버라이드하면, MVC 설정 전체의 책임을 떠안게 된다. 부품 하나 바꾸려다 공장 전체를 인수하는 꼴이다.

`WebMvcConfigurer`는 바로 이 지점을 위해 존재한다. 본체는 그대로 두고, 본체가 *정해진 시점에 불러주는 콜백 자리*만 따로 빼놓은 것이다. 그래서 나는 `WebMvcConfigurationSupport`를 상속하지 않고, `WebMvcConfigurer`의 메서드 중 필요한 것만 구현하면 된다. 본체(`DelegatingWebMvcConfiguration`)가 설정을 조립하다가, 각 단계에서 등록된 `WebMvcConfigurer`들의 해당 콜백을 호출해 *내가 채운 부분을 끼워 넣는다.*

이게 첫 의문의 답이다. 화면 매핑과 인터셉터와 파라미터 주입이 한 인터페이스에 모여 있는 이유는, **이것들이 전부 "거대한 MVC 설정 본체에 일부만 얹는 확장 자리"라는 같은 성격을 갖기 때문**이다. 하는 일은 달라도, 본체에 끼어드는 방식은 똑같이 콜백이다.

두 번째로 "콜백"이라는 점이 인터페이스의 모양을 설명한다. `WebMvcConfigurer`의 메서드는 전부 *디폴트 빈 구현*이다.

```java
public interface WebMvcConfigurer {
    default void addViewControllers(ViewControllerRegistry registry) {}
    default void addInterceptors(InterceptorRegistry registry) {}
    default void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {}
    // ... 십수 개 더, 전부 default 빈 구현
}
```

그래서 `implements WebMvcConfigurer`를 해도 강제로 구현할 메서드가 없다. 채우고 싶은 콜백만 오버라이드하면 된다. 이 디폴트 메서드가 자바 8부터 가능해졌기 때문에, 그 전까지 빈 구현을 대신 제공하던 `WebMvcConfigurerAdapter`라는 추상 클래스는 스프링 5.0에서 deprecated 되었다. 지금은 인터페이스를 직접 구현하는 게 정석이다.

### 구조: 여러 개를 어떻게 합치나, 그리고 부트와의 관계

콜백이라는 성격에서 두 가지 구조가 따라 나온다.

첫째, **여러 개를 둬도 누적된다.** `WebMvcConfigurer`를 구현한 클래스를 여러 개 만들 수 있고, 스프링은 그것들을 전부 모아 각 콜백을 모든 구현체에 차례로 호출한다. 내부적으로 `DelegatingWebMvcConfiguration`이 `WebMvcConfigurerComposite`에 위임해 이 fan-out을 처리한다. 그래서 인증 설정과 포맷 설정을 별도 클래스로 쪼개도 충돌 없이 다 등록된다. 덮어쓰기가 아니라 합쳐지는 것이다.

둘째, **스프링 부트의 자동설정과 겹치지 않고 얹힌다.** 부트는 `WebMvcAutoConfiguration`으로 MVC의 합리적 기본값(메시지 컨버터, 정적 리소스 경로, 날짜 포매터 등)을 미리 깔아 둔다. `WebMvcConfigurer`는 그 자동설정을 끄지 않고 위에 더하는 방식이다. 부트 레퍼런스가 이 경계를 명시한다.

> If you want to keep those Spring Boot MVC customizations and make more MVC customizations (interceptors, formatters, view controllers, and other features), you can add your own @Configuration class of type WebMvcConfigurer but without @EnableWebMvc.

자동설정을 유지한 채 더 손보고 싶으면 `@EnableWebMvc` 없이 `WebMvcConfigurer`만 구현하라는 것이다. 거꾸로 `@EnableWebMvc`를 붙이면 부트의 MVC 자동설정이 통째로 꺼지고, 기본값을 직접 다 깔아야 한다. 그래서 부트 앱에서 내 `WebConfig`처럼 `@EnableWebMvc` 없이 `WebMvcConfigurer`만 구현하는 게 정석인 이유가 여기 있다.

```
WebMvcConfigurer 구현      → 자동설정 살리고 위에 얹기   (부트의 정석)
@EnableWebMvc 추가         → 자동설정 끄고 수동 전체 제어  (보통 불필요)
WebMvcConfigurationSupport → 더 낮은 레벨 전체 제어        (거의 안 씀)
```

### 구조를 요청 파이프라인 위에 올려보기

이제 메서드들이 제각각으로 안 보이고, *요청이 처리되는 길목마다 하나씩 끼는 자리*로 보인다. 요청 하나가 들어와 응답이 나가기까지의 흐름 위에 각 콜백을 얹으면 이렇게 된다.

```
요청
 │
 ▼
DispatcherServlet (MVC 입구)
 │
 ├─ configurePathMatch        URL을 어떻게 매칭할지
 ├─ addInterceptors           컨트롤러 전: 권한 검사 등 가로채기
 ├─ addArgumentResolvers      컨트롤러 파라미터를 무엇으로 채울지
 ├─ addFormatters             "2026-06-01" 같은 문자열을 객체로 변환
 ▼
 Controller
 │
 ├─ configureMessageConverters  반환 객체를 JSON 등으로 직렬화
 ├─ addViewControllers          (화면이면) URL을 뷰 이름으로
 ├─ addResourceHandlers         /css/**, /js/** 같은 정적 파일
 ▼
응답
```

화면 매핑(`addViewControllers`)은 이 길목 중 하나일 뿐이었다. 내가 본 건 그 한 자리였고, 같은 인터페이스의 다른 메서드들은 *같은 길의 다른 길목*을 담당하고 있었다.

### 실측 매칭: @RequestParam LocalDate가 그냥 파싱되는 이유

이 구조가 내 코드의 한 장면을 설명해 준다. 시간 조회 API는 이렇게 생겼다.

```java
@GetMapping("/availability")
public ResponseEntity<TimeWithStatusResponses> searchAvailableReservationTime(
        @RequestParam LocalDate date,
        @RequestParam Long themeId) { ... }
```

`/times/availability?date=2026-06-01&themeId=1`로 요청하면 쿼리스트링의 `"2026-06-01"`이라는 *문자열*이 `LocalDate` *객체*로 알아서 변환돼 들어온다. 나는 변환 코드를 한 줄도 쓰지 않았다. 이게 가능한 건 위 파이프라인의 `addFormatters` 자리에, 부트가 날짜·시간 포매터를 기본으로 이미 등록해 뒀기 때문이다.

그래서 만약 클라이언트가 `2026/06/01`처럼 다른 형식으로 날짜를 보내게 하고 싶다면, 손댈 자리도 정해진다. `WebConfig`에 `addFormatters`를 오버라이드해 내 날짜 포매터를 그 자리에 끼우면 된다. 화면 매핑을 `addViewControllers`에 등록한 것과 정확히 같은 방식이다. 어떤 메서드를 골라 무엇을 등록할지는, *그 동작이 요청 파이프라인의 어느 길목 일인가*로 결정된다.

내 `WebConfig`가 `addViewControllers` 하나만 채운 단순판이었던 건, 이 프로젝트에서 내가 손볼 길목이 화면 매핑 하나뿐이었기 때문이다. 인증 미션에서 칸이 셋으로 는 건 손볼 길목이 늘었기 때문이고. 클래스가 복잡해진 게 아니라, *끼울 자리를 더 쓴 것*이다.

### 정리

- `WebMvcConfigurer`는 Spring MVC 설정 본체(`WebMvcConfigurationSupport`)를 상속해 갈아엎지 않고, 본체가 불러주는 *콜백 자리*에 일부만 얹게 해주는 확장 인터페이스다.
- 화면 매핑, 인터셉터, 아규먼트 리졸버처럼 하는 일이 달라도 한 인터페이스에 모인 이유는, 전부 "본체에 끼어드는 확장 자리"라는 같은 성격이기 때문이다.
- 모든 메서드가 디폴트 빈 구현이라 필요한 콜백만 오버라이드한다. 자바 8 디폴트 메서드 덕에 `WebMvcConfigurerAdapter`는 스프링 5.0에서 deprecated 되었다.
- 여러 구현체는 덮어쓰기가 아니라 누적된다(`WebMvcConfigurerComposite`). 그래서 설정을 여러 클래스로 쪼개도 된다.
- 부트 앱에서는 `@EnableWebMvc` 없이 구현해 자동설정을 살린 채 얹는 게 정석이다. `@EnableWebMvc`는 자동설정을 끄고 전체를 직접 제어하겠다는 선언이다.

### 다음 룰

`WebMvcConfigurer`의 어떤 메서드를 쓸지 고민될 때는, 바꾸려는 동작이 *요청이 처리되는 길목 중 어디에 해당하는가*를 먼저 묻는다. URL 매칭인지, 컨트롤러 앞의 가로채기인지, 파라미터 채우기인지, 직렬화인지. 길목이 정해지면 메서드는 거기서 따라 나온다. 설정 클래스를 메서드 이름으로 외우는 대신 파이프라인 위 위치로 기억하면, 새 요구가 와도 끼울 자리를 바로 찾을 수 있다.
