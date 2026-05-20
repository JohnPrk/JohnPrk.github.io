---
title: "인터셉터로 인증을 짜다가 공식 문서에서 본 한 줄"
category: "spring"
slug: "interceptor-not-for-auth"
num: 11
date: 2026-05-20
description: "우테코 방탈출 미션은 Spring Security 없이 Interceptor와 ArgumentResolver로 인증/인가를 직접 짜라고 가르친다. 그 톤대로 AuthInterceptor를 다 짠 뒤, 인터셉터를 더 깊게 이해하려고 Spring 공식 문서를 열었다. 두 페이지에 같은 경고 한 줄이 박혀 있었다. Interceptors are not ideally suited as a security layer. 그 한 줄을 따라가다 보니 인터셉터의 진짜 자리, Acegi 시절부터 다른 곳에 있던 Spring Security의 자리, 그리고 Security가 다른 점이 차례로 풀렸다."
tags: ["스프링", "인터셉터", "인증", "인가", "스프링시큐리티", "필터", "HandlerInterceptor", "우테코"]
---

### 시작점, 미션이 가르친 패턴

우테코 방탈출 인증/인가 미션을 받았다. 미션 자료가 처음부터 도구를 못박는다.

> 이번 미션에서는 Spring Security를 사용하지 않습니다. 직접 만들어보는 과정에서 인증/인가가 왜 필요한지, 어떤 지점에서 반복과 선택이 생기는지를 경험하는 것이 목적입니다.

> Interceptor와 ArgumentResolver를 인증/인가를 위한 도구로 사용해본다.

사전학습 자료에서는 한 발 더 들어가 `LoginCheckInterceptor` 샘플 코드까지 직접 제시한다.

> 이번 미션에서 MVC Config는 그 자체가 목적이 아닙니다. 인증/인가를 공통 처리하기 위한 도구로만 다룹니다.

> Interceptor는 요청을 통과시킬지 막을지 결정하기 좋다.

이 톤대로 `AuthInterceptor`를 짰다.

```java
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final MemberIdResolver memberIdResolver;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws IOException {
        if (memberIdResolver.resolve(request) == null) {
            if (BrowserRequest.isHtmlRequest(request)) {
                response.sendRedirect(BrowserRequest.loginRedirectUrl(request));
                return false;
            }
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return true;
    }
}
```

`WebConfig`에서 경로별로 인터셉터를 적용했다.

```java
@Override
public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authInterceptor)
            .addPathPatterns("/members/me", "/reservations", "/reservations/me/**");
    registry.addInterceptor(adminInterceptor)
            .addPathPatterns("/admin/**");
}
```

그동안 다른 프로젝트에서는 Spring Security를 거의 무지성으로 갖다 썼다. `SecurityConfig` 한 파일에 DSL을 적당히 채우고, 인증이 되면 그걸로 끝이라고 생각했다. 인터셉터와 무엇이 다른지 한 번도 정리해본 적이 없다. 이번 미션을 풀면서 *그 차이를 손으로 만든다*는 의미가 비로소 잡혔다. 인터셉터를 쓰지 못하던 자리에서 Security가 등장하는 패턴인가 보다, 정도의 막연한 그림.

### 의문, 공식 문서에서 본 한 줄

인터셉터를 더 깊게 이해하려고 Spring 공식 문서를 열었다. MVC Config의 [Interceptors 페이지](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html). 등록 코드 예시 바로 뒤에 다음 단락이 있었다.

> Interceptors are not ideally suited as a security layer due to the potential for a mismatch with annotated controller path matching. Generally, we recommend using Spring Security, or alternatively a similar approach integrated with the Servlet filter chain, and applied as early as possible.

한 번 읽고 페이지를 닫으려는데, 같은 문장이 한 단계 위 페이지인 [Interception 페이지](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html)에도 그대로 박혀 있었다. `HandlerInterceptor` 세 메서드의 설명이 끝난 다음 마지막 단락. 토씨 하나 안 빠진 동일 문장.

같은 경고가 두 곳에 반복된다는 건 의도된 강조다. 이 문장의 뼈대를 풀어보면 이렇다.

- 인터셉터는 보안 계층으로 적합하지 않다 (not ideally suited).
- 이유는 *annotated controller path matching* 과 어긋날 수 있기 때문.
- 권장은 Spring Security, 또는 그와 비슷하게 Servlet 필터 체인에 통합된 방식.
- 그리고 *가능한 한 일찍* 적용하라.

미션 자료의 톤(인터셉터로 인증을 짠다)과 공식 문서의 톤(인터셉터는 보안에 적합하지 않다)이 정반대로 부딪혔다.

여기서 멈추고 *인터셉터가 원래 무엇을 위해 만들어진 도구인가*를 다시 보기로 했다.

### 인터셉터의 태생을 거꾸로 따라가기

`HandlerInterceptor`는 Spring 1.x 시대(2003년경)에 만들어졌다. 그 시기 자바 웹은 JSP, Velocity, Freemarker 같은 *서버 사이드 렌더링*이 표준이었다. 컨트롤러가 모델을 만들고 뷰가 렌더링되는 흐름.

Spring MVC 팀이 이 흐름의 사이사이에 끼어들 훅으로 인터셉터를 만들었다. `HandlerInterceptor`의 세 메서드 시그니처를 보면 그 의도가 그대로 드러난다.

```java
boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler);
void    postHandle(HttpServletRequest req, HttpServletResponse res, Object handler, ModelAndView mv);
void    afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex);
```

`postHandle`이 `ModelAndView`를 받는다는 점이 결정적 단서다. *뷰 렌더링 전에 모델을 가공하라*고 만들어진 자리. 인증/인가는 모델 가공과 무관하다.

Spring 본체가 처음부터 제공하는 인터셉터 구현체들을 보면 더 분명해진다.

- `LocaleChangeInterceptor`: 쿼리 파라미터로 로케일 변경
- `ThemeChangeInterceptor`: 테마 변경
- `WebContentInterceptor`: 캐시 헤더 일괄 설정
- `ConversionServiceExposingInterceptor`: 뷰에 ConversionService 노출
- `ResourceUrlProviderExposingInterceptor`: 뷰에 정적 자원 URL 제공자 노출

전부 *뷰 렌더링 전에 컨텍스트를 세팅*하는 일이다. 보안용 구현체는 한 개도 없다. 정확히 말하면 `UserRoleAuthorizationInterceptor` 하나가 있긴 한데, *같은 페이지가 같은 페이지에서 보안에는 권하지 않는다*고 말하는 그 도구다. "쓸 수는 있다, 그러나 권하지 않는다"가 공식 입장.

그러면 인증/인가의 자리는 처음부터 어디에 있었나. Acegi Security다. 2003년에 출시되어 2007년에 Spring Security로 이름이 바뀐 그 프로젝트. 처음부터 *서블릿 필터 체인 위에서* 인증/인가를 처리했다.

시간 순서로 정리하면 이렇다.

```
2003년경
├── Acegi Security (필터 체인 기반 인증/인가)  ← 보안 담당
└── Spring MVC HandlerInterceptor              ← 모델/뷰/로케일 담당
```

두 도구가 거의 같은 시기에 *서로 다른 문제*를 풀기 위해 만들어졌다. 한쪽이 다른 쪽의 대체재가 아니다. 인터셉터가 보안용으로 만들어졌다가 부족해서 Security가 나온 게 아니다. 처음부터 자리가 달랐다.

### 그러면 미션 요구사항은 왜 인터셉터로 가르치나

여기서 모순처럼 보이던 두 톤이 정렬된다. 미션 자료의 한 문장을 다시 본다.

> 이번 미션에서는 Spring Security를 사용하지 않습니다. 직접 만들어보는 과정에서 인증/인가가 왜 필요한지, 어떤 지점에서 반복과 선택이 생기는지를 경험하는 것이 목적입니다.

목적이 *학습*이라고 명시되어 있다. 인터셉터가 *인증/인가의 표준 위치*라고 가르치는 게 아니라, 인증/인가의 메커니즘을 손으로 만들어 보기 위한 *연습 도구*로 쓰는 거다. 더 정확히는, "어떤 지점에서 반복과 선택이 생기는지"를 경험하라는 표현이 *왜 Security 같은 도구가 따로 필요한지*를 직접 깨닫게 만드는 장치에 가깝다.

미션 진행 중에는 이 의도가 잘 안 보였다. "인터셉터로 인증을 짜라"는 요구사항이 너무 또렷해서, 그게 일반적 패턴인가 보다 라고 머릿속에 굳어가던 차였다. 공식 문서의 한 줄이 그 굳음을 깨뜨렸다.

### 내가 짠 코드는 어떤 위험을 안고 있나

다시 내 `AuthInterceptor`로 돌아온다. 동작은 한다. 미션의 모든 시나리오를 통과한다. 그러면 공식 문서가 경고한 *annotated controller path matching* 의 불일치는 구체적으로 어디서 발생하나.

내 `WebConfig`는 이렇게 적용 경로를 박았다.

```java
registry.addInterceptor(adminInterceptor).addPathPatterns("/admin/**");
```

이 `/admin/**` 패턴은 Spring의 `AntPathMatcher`로 매칭된다. 한편 `@RequestMapping("/admin/users/{id}")` 같은 컨트롤러 매핑은 *Spring MVC 자체의 경로 매처*가 처리한다. 두 매처는 같은 코드를 공유하지만, *경로 정규화 규칙*은 시기에 따라 미묘하게 갈렸다. 트레일링 슬래시, path parameter, 확장자, URL 인코딩된 점 같은 변형들이 그 틈이다.

원리적으로 이런 변형이 우회로가 될 수 있다.

- `/admin/users/123;jsessionid=abc` (path parameter)
- `/admin/users/123/` (trailing slash)
- `/admin//users/123` (중복 슬래시)
- `/admin/users/%2e%2e/public/...` (인코딩된 점)

인터셉터의 `/admin/**`은 매칭 못 하지만, 컨트롤러의 `@RequestMapping`은 매칭에 성공하는 조합이 한 군데라도 있으면, 그게 바로 *인증 우회 경로*다. Spring MVC가 지난 몇 년간 경로 매칭 규칙을 여러 번 바꾼 이유가 이거다. 그 사이의 미세한 불일치가 보안 사고로 이어진 사례들이 누적되어 왔다.

내 미션 코드가 *공격받을 일이 없다*는 건 그저 위협 모델이 작아서다. 내부 학습 환경이고, 공격자가 path 변형을 시도하는 시나리오가 없다. *코드가 안전해서*가 아니다.

### Security를 쓰면 다 해결되나

이게 다음으로 자연스럽게 떠오른 질문이었다. Security를 쓰면 무지성으로 안전해지는가.

답은 *아니다*. Security도 결국 잘 짜인 필터 체인이다. 잘못 설정하면 똑같이 뚫린다. 예전 프로젝트에서 무지성으로 썼던 내 `SecurityConfig`도 다시 본다면 분명 빈 구멍이 있었을 거다. `permitAll()`로 잘못 열어둔 경로, `csrf().disable()` 후 잊혀진 페이지, `@PreAuthorize`가 동작 안 하던 자리. Security가 안전을 *자동으로 보장*하는 도구가 아니라는 점은 짚어두는 게 정직하다.

그러면 Security가 *진짜로* 다른 점은 뭔가. 공식 문서가 권장하는 이유는 뭔가. 정리해보면 이렇다.

**경로 정규화의 일관성.** Security 필터는 컨트롤러 매핑과 같은 정규화를 거친 경로로 권한을 검사한다. 위에서 본 우회 경로 변형들이 *누적된 CVE 패치*로 막혀 있다. 새 우회 경로가 발견될 때마다 패치되고, 그 패치가 의존성 업데이트만으로 따라온다.

**알려진 공격에 대한 기본 방어.** 설정 한 줄 안 해도 켜져 있는 것들이 있다. CSRF 토큰, 세션 고정 방어, `X-Frame-Options`, `X-Content-Type-Options`, HSTS, 인증된 응답의 캐시 차단. 인터셉터로 직접 짤 때 *생각조차 못 하는* 항목들.

**인증 방식 추상화.** 폼 로그인, HTTP Basic, JWT, OAuth2, SAML, X.509 인증서가 *같은 Authentication 객체*로 귀결된다. 인증 후의 인가 로직은 어떤 방식으로 인증했든 동일하게 동작한다.

**검증 표면적의 차이.** 직접 짠 인증 코드는 *내가 본 코드*다. Security는 *전 세계가 본 코드 + 보안 연구자가 공격해본 코드*다. 같은 일을 하지만 검증 표면적의 크기가 다르다. 이게 가장 본질적인 차이다.

### 단편 정리

- 인터셉터는 인증/인가용 도구가 아니다. 모델/뷰 가공의 횡단 관심사 훅으로 태어났다. Spring 본체가 제공하는 구현체들이 그 의도를 그대로 보여준다.
- 미션이 "Security 없이 인터셉터로" 라고 가르치는 건 학습 의도다. 표준 패턴이라는 신호가 아니다. 미션 자료 안에 *목적이 학습*이라고 명시되어 있고, 그 한 줄이 톤의 비밀번호다.
- 공식 문서 두 페이지에 같은 경고가 박혀 있다. *Interceptors are not ideally suited as a security layer*. 두 번 박혔다는 건 의도된 강조다.
- 인터셉터로 짠 인증이 동작한다고 안전한 건 아니다. URL 정규화 불일치라는 함정이 있고, 학습 환경에서는 위협 모델이 작아서 드러나지 않을 뿐이다.
- Security를 쓰면 *자동으로* 안전해지는 게 아니다. Security가 다른 점은 *안전한 기본값 + 누적된 CVE 패치 + 검증 표면적*이다. 이걸 자체 구현으로 따라잡는 건 거의 불가능하다.

### 다음에 쓸 때의 룰

- 도구를 처음 쓸 때 *왜 그 자리에 있나*를 공식 문서에서 한 번 확인한다. 미션 요구사항이 곧 표준 패턴이라고 단정하지 않는다.
- 머릿속에 "이게 표준 패턴인가 보다"가 굳어가는 순간이 가장 위험하다. 한 번씩 의심하고 공식 문서로 돌아간다. *같은 문장이 두 페이지에 박혀 있다면 그건 강조다.*
- 학습용 인증을 인터셉터로 짜는 건 OK. 같은 코드를 공개 서비스에 그대로 올리는 건 안 된다. 이게 경계다.
