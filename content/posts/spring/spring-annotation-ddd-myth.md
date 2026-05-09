---
title: "스프링은 DDD에서 영감을 받았을까 — @Repository Javadoc을 11년 거꾸로 읽어보고"
category: "spring"
slug: "spring-annotation-ddd-myth"
num: 1
date: 2026-05-09
description: "코치는 \"스프링은 DDD에서 영감 받았다\"고 했고, 나는 그 말을 곧이곧대로 적용해 Repository와 DAO를 엄밀하게 분리한 PR을 제출했다. 리뷰어 웨지는 \"DDD를 왜 적용하나요?\"라고 되물었다. Spring Javadoc을 버전별로 거슬러 올라가니, 어노테이션의 DDD 인용은 도입 5년 뒤에 사후 추가된 것이었고, 3계층 구조의 진짜 출처는 DDD가 아닌 곳에 있었다."
tags: ["스프링", "DDD", "레이어드 아키텍처", "Repository", "우테코"]
---

### 시작점 — "스프링은 DDD에서 영감을 받았다"

우테코 사이클1 미션은 방탈출 예약 시스템에 테마와 사용자 예약을 얹는 작업이었다. 코치 강의에서 한 줄이 머리에 박혀 있었다.

> 스프링은 DDD에서 영감을 받았다.

평소 관례적으로 `Controller`, `Service`, `Repository`로 클래스를 나눠 썼지만, 정확히 왜 이렇게 나누는지 설명하라면 못 했다. `Repository`와 `DAO`가 뭐가 다른지도 두루뭉술했다. 이번엔 핑계 삼아 원전을 따라 정확히 적용해보자고 마음먹고 PR 본문에 그렇게 적었다.

> 우선 개념을 원저자의 의도대로 정확하게 적용해 보고, 프로젝트 상황에 맞지 않아 변형이 필요할 때 팀원들과 협의하여 수정하는 것이 합리적인 접근이라고 판단했습니다.

`ReservationDao`는 RowMapper로 데이터를 가져오고, `ReservationRepository`는 그걸 받아 도메인 객체로 재조립(reconstitute)하는 — DDD 원전의 분리를 흉내 낸 구조를 만들었다. 그리고 첫 자기-리뷰 코멘트에 이렇게 썼다.

> Eric Evans의 DDD 원저를 보면, "Repository는 도메인 모델의 컬렉션처럼 동작하며 영속성 메커니즘을 캡슐화한다"고 되어 있고, DAO는 전통적으로 하부 DB 접근 로직을 캡슐화합니다. 이 원저자의 의도대로 엄밀하게 책임을 나눈다면, DAO의 RowMapper는 순수 DTO만 반환하고, Repository가 그 DTO를 받아 완전한 도메인 객체로 재조립(Reconstitute)하는 책임을 져야 한다고 생각했습니다.

여기까지가 이 글의 출발점이다.

### 발견 — 웨지의 되물음

리뷰어 웨지(sihyung92)의 답변은 짧았다.

> 레이어드를 적용하다보면 100% 규칙에 맞출수는 없습니다. 대략 70% 정도는 들어맞고, 30% 정도는 아무것도 없이 위임을 하는 코드가 되면 어느정도 성공인데요. 구현하신 내용에서는 100% 위임을 하고 있으니 실익이 없는 코드이고, 기계적인 패턴 적용으로 안티패턴입니다. **DDD를 왜 적용해야 하나요? 여기에 대한 답변부터 해보셔야 할거 같네요.**

내 코드를 다시 봤다. `ReservationRepository`는 `ReservationDao`를 주입받아 메서드를 그대로 위임하는 패스스루(pass-through)였다. "원저자 의도대로"를 형태만 따라간 결과 클래스 두 개가 의미 없이 한 줄씩 위임만 하고 있었다.

같은 PR의 다른 자리에서 또 한 번 비슷한 결을 받았다. 도메인 객체에 비즈니스 로직이 거의 없고 게터만 있는 점에 대해 나는 "트랜잭션과 DB 의존성 때문에 서비스 계층에서 처리하게 되었다"고 변명했고, 웨지는 이렇게 답했다.

> 트랜잭션과 DB 의존성을 근거로 들어주신 부분은 공감이 잘 안 됩니다. 지금 설치해주신 트랜잭션 중에 유효한 트랜잭션이 없어서요. 트랜잭션을 전부 걷어내고 본인이 생각하는 도메인 중심으로 설계해보셔도 괜찮다고 생각이 들어요. **repository를 DB 접근 계층이라고 생각하지 말고 도메인 컬렉션이라고 접근하면서요.**

두 코멘트가 가리키는 방향이 같았다. 나는 `Repository`를 "DDD에서 따온 이름이 붙은 DAO 계층"으로 다루고 있었던 거다. 그래서 한 줄짜리 위임 클래스가 만들어졌고, 도메인은 게터 가방이 됐다.

거기서 의문이 한 번에 터졌다. 그러면 처음부터 묻고 싶었던 것들로 돌아간다.

- `Repository`와 `DAO`는 정확히 어떻게 다른가?
- 스프링이 정말 DDD에서 영감을 받았다면, 어디서부터 어디까지가 DDD인가?
- `Service`/`Repository` 클래스로 나누는 이 구조 — 이걸 누가 정한 건가? 그냥 관례인가?

먼저 `@Repository` 어노테이션 자체부터 보기로 했다. "스프링이 DDD에서 영감 받았다"는 말의 가장 직접적인 흔적이라면 거기 있을 것이라고 생각해서다.

### Spring Javadoc 버전별 비교 — 어노테이션이 처음 나왔을 때 DDD 인용은 없었다

지금 버전(7.x) Javadoc은 이렇게 시작한다.

> Indicates that an annotated class is a "Repository", originally defined by Domain-Driven Design (Evans, 2003) as "a mechanism for encapsulating storage, retrieval, and search behavior which emulates a collection of objects".

`@Service`도 비슷하다.

> Indicates that an annotated class is a "Service", originally defined by Domain-Driven Design (Evans, 2003) as "an operation offered as an interface that stands alone in the model, with no encapsulated state."

겉보기엔 "어노테이션이 처음부터 DDD를 인용했다"는 인상을 주기에 충분하다. 그래서 옛 버전 Javadoc을 거슬러 올라가 봤다.

| Spring 버전 | 출시 시점 | `@Repository` Javadoc 첫 줄 |
|---|---|---|
| 2.0 | 2006-10 | Indicates that an annotated class is a "Repository" (or "DAO"). |
| 2.5 | 2007-11 | (위와 동일, "As of Spring 2.5..." 한 줄만 추가) |
| 3.0 | 2009-12 | (위와 동일) |
| 3.1 | 2011-12 | Indicates that an annotated class is a "Repository", originally defined by Domain-Driven Design (Evans, 2003)... |

Spring 2.0부터 3.0까지는 DDD 인용이 **없었다**. `@Repository`는 그냥 `(or "DAO")`라고만 적혀 있었고, `@Service`는 `(e.g. a business service facade)`라고만 되어 있었다. DDD 인용 문구는 3.1에 처음 등장한다.

그러면 그 사이 어디서 들어왔나. GitHub 블레임으로 보니 한 커밋에 잡혔다.

```
commit 15a8f77
Date:   2011-09-13
"Clarify stereotype and exception translation Javadoc"
```

`@Repository` 도입은 2006년 10월(Spring 2.0). DDD 인용 추가는 2011년 9월. **약 5년 차이**다. `@Service`도 도입은 2007년 11월(Spring 2.5)이고, 같은 2011년에 DDD 인용이 사후 추가됐다. 어노테이션이 처음 나올 때부터 DDD를 인용한 게 아니다. 코드는 먼저 만들어졌고, "이게 사실 DDD의 그 개념이었다"는 의미 부여는 한참 뒤에 붙었다.

그러면 처음에 무슨 동기로 만들어졌나. Spring 2.0의 `@Repository` Javadoc을 보면 그것도 잡혀 있다.

> A class thus annotated is eligible for Spring DataAccessException translation.

`@Repository`는 처음에 **DAO 레이어를 표시하는 마커**였다. 정확히는 `PersistenceExceptionTranslationPostProcessor`가 자동으로 프록시를 감싸 JPA·Hibernate·JDBC 예외를 모두 Spring의 `DataAccessException` 계층으로 변환해주기 위한 마커. DDD 개념을 코드로 옮긴 게 아니라, **persistence 기술의 다양성을 흡수하기 위한 실용적 도구**였다.

`@Service`는 한술 더 떠서 2007년 도입 당시 Javadoc이 한 줄짜리였다.

> Indicates that an annotated class is a "Service" (e.g. a business service facade).

DDD 언급은커녕 `@Component`의 specialization으로 classpath scanning 대상을 분류하기 위한 라벨에 가까웠다.

### 그러면 3계층은 어디서 왔나 — DDD 이전의 출처

여기서 더 거슬러 올라갈 필요가 생겼다. 어노테이션이 DDD를 사후 인용한 거라면, "스프링이 DDD에서 영감을 받았다"는 문장은 어디서 검증되는가? 적어도 3계층 구조는?

세 권의 책과 한 줄의 코드를 따라가면 답이 나온다.

**2001 — Core J2EE Patterns (Alur/Crupi/Malks)**
DAO 패턴이 정식으로 명명된 자리. Sun J2EE 진영에서 EJB CMP, JDBC, JDO 등 저장소 기술이 너무 다양해서 비즈니스 코드를 거기에 묶지 않기 위해 정리된 패턴 카탈로그. 책은 *Presentation Tier / Business Tier / Integration Tier*로 패턴을 분류했고, DAO는 Integration Tier 패턴이었다.

**2002 — Patterns of Enterprise Application Architecture (Martin Fowler)**
지금 우리가 쓰는 *Service Layer*, *Repository*, *Domain Model*, *Data Mapper* 같은 클래스 단위 패턴 어휘가 한 카탈로그에 정리된 책. 중요한 사실 하나 — **"Repository"라는 단어 자체는 Fowler가 Evans보다 1년 먼저 썼다.** PoEAA가 2002년, DDD가 2003년이다. 두 책의 Repository 챕터는 서로 cross-reference하고 동시에 정립된 개념인데, 한국 자료에서 흔히 보이는 "Repository = DDD 고유 개념"이라는 통념은 엄밀히는 부정확하다.

**2002 — Expert One-on-One J2EE Design and Development (Rod Johnson)**
Spring의 모태가 된 책. 책 본문보다 책에 동봉된 약 30,000줄짜리 프레임워크 코드가 더 결정적이다. 패키지 이름은 `com.interface21.*` (Interface21은 Rod Johnson의 회사명, "21세기를 위한 인터페이스"). 이 코드를 Wrox 출판사 포럼에서 본 Juergen Hoeller와 Yann Caroff가 Rod에게 오픈소스화를 설득했고, 그 결과물이 **Spring**이다.

**2003 — Domain-Driven Design (Eric Evans)**
Repository, Service, Entity, Value Object, Aggregate를 하나의 ubiquitous language로 묶은 책. PoEAA가 카탈로그라면 DDD는 그 위에 도메인 중심의 의미 체계를 얹은 책에 가깝다.

**2004 — Spring 1.0**
`com.interface21.*` 코드의 패키지가 `org.springframework.*`로 바뀌고 Apache 2.0 라이선스로 정식 출시. 이 시점에 이미 `JdbcTemplate`(원래 `com.interface21.jdbc.core`), `DispatcherServlet`/`Controller`(원래 `com.interface21.web.servlet`), 트랜잭션·AOP·ORM 통합이 다 들어 있었다. **Controller-Service-DAO 3계층은 Spring 1.0이 만들어낸 게 아니라, 책 동봉 코드가 그대로 프레임워크화된 것**이다.

**2006~2007 — Spring 2.0/2.5**
이 책 코드가 5년쯤 굳은 시점에 `@Repository`(2006, Rod Johnson + Juergen Hoeller), `@Service`/`@Controller`/`@Component`(2007, Juergen Hoeller)가 어노테이션으로 표면화됐다. 이때까지도 Javadoc에 DDD 인용은 없다.

**2011-09-13 — 커밋 `15a8f77`**
"Clarify stereotype and exception translation Javadoc". `@Repository`와 `@Service` Javadoc에 Evans(2003)의 정의가 사후 추가된다. 이때부터 우리가 지금 보는 "originally defined by Domain-Driven Design (Evans, 2003)" 문구가 박혀 있다.

이 시간선을 한 번 깔고 보면 "스프링이 DDD에서 영감을 받았다"는 문장은 두 부분으로 갈라진다.

- **이름은 가져왔다.** `@Repository`, `@Service`라는 이름은 분명히 DDD에서 따온 것이고, 어노테이션 도입 시점부터 그 이름이 붙어 있었다. 2011년의 Javadoc 정정은 그 차용 사실을 명시화한 것에 가깝다.
- **구조는 가져온 게 아니다.** Controller-Service-Repository로 클래스를 나누는 3계층은 DDD에서 온 게 아니라 **2001~2002년 J2EE 패턴 운동(Core J2EE Patterns + PoEAA + Rod Johnson 책)**이 Spring을 통해 사실상 표준이 된 것이다. DDD는 그 위에 의미를 덧입혔다.

### 다시 웨지의 되물음으로

이 시간선을 깔고 웨지의 두 코멘트를 다시 보면 두 코멘트가 같은 자리를 가리키고 있다는 게 보인다.

> DDD를 왜 적용해야 하나요?
> repository를 DB 접근 계층이라고 생각하지 말고 도메인 컬렉션이라고 접근하면서요.

내가 한 일은 — DDD 원전이 말하는 "도메인 컬렉션으로서의 Repository"를 적용하려고 했지만, 실제로는 *J2EE 시대부터 내려온 DAO 패턴*과 *PoEAA의 Repository 패턴*이 Spring 안에서 굳어진 관례 위에 DDD라는 라벨만 덧붙인 셈이었다. 그래서 `Repository`라는 이름은 DDD에서 왔는데, 그 안의 코드는 DAO처럼 한 줄씩 위임만 하는 모양이 됐다. 이름과 책임이 어긋난 자리.

웨지가 "100% 위임은 안티패턴"이라고 한 건 이 어긋남을 정확히 짚은 거다. 클래스 두 개를 만들어 놓고 한쪽이 다른 쪽에 한 줄씩 위임만 한다면, **이름만 DDD고 구조는 DAO**라는 뜻이다. "DDD를 왜 적용하나요?"는 그래서 따끔한 질문이다 — 도메인 컬렉션으로서의 Repository를 정말 활용할 비즈니스 로직이 거기 있는가, 아니면 그냥 이름만 따라 쓰고 있는가.

같은 PR의 또 다른 코멘트가 이 점을 한 번 더 짚는다. 내가 `findReservedTimeIdsByDateAndThemeId`라는 메서드로 `Set<Long>`을 반환하고 facade에서 절차지향적으로 처리한 부분에 대해 웨지는 이렇게 적었다.

> Set<Long>을 반환하는 설계는 facade에서 절차지향적으로 처리하기 위해 API부터 의도된 거에요. reservationService니까 Reservation 컬렉션을 응답했으면 "TimeAvailability"라는 도메인적으로 객체간 협력할 수 있는 여지가 생기고, 해당 도메인을 중심으로 캡슐화가 일어나겠죠. 예를 들어 Reservations가 컬렉션 일급 객체가 있고 reservations.findOccupiedTimes() 같은 메서드를 활용한다던지요.

이쪽이 진짜 DDD의 Repository 활용에 가깝다. 도메인 컬렉션으로서 Reservations를 돌려주고, 거기서 협력이 일어나게 하는 형태. 내 코드는 `Repository`라고 이름을 붙였지만 결국 "DB에서 ID 셋을 꺼내오는 도구"로 쓰고 있었다.

### 정리

이번 미션에서 알게 된 것들을 짧게 적어둔다.

- **`@Repository`는 처음부터 DDD 어노테이션이 아니었다.** 2006년 도입 시점에는 `DataAccessException` 자동 변환을 위한 마커였고, DDD 인용은 2011년에 사후 추가됐다. `@Service`도 마찬가지다.
- **"Repository"라는 단어는 Fowler가 Evans보다 1년 먼저 썼다.** PoEAA(2002) → DDD(2003). 두 책은 cross-reference하고 동시에 정립된 개념이다. "Repository = DDD 고유 개념"은 정확하지 않다.
- **Controller-Service-Repository 3계층은 DDD에서 온 게 아니다.** Core J2EE Patterns(2001) + PoEAA(2002) + Rod Johnson 책(2002)의 J2EE 패턴 운동이 Spring 1.0(2004)을 통해 사실상 표준이 된 것이다. 어느 명세도 "이렇게 나눠라"고 강제한 적이 없고, 누적된 관례에 가깝다.
- **이름이 DDD라고 책임도 DDD인 건 아니다.** `Repository`라는 이름이 붙어 있어도, 안에서 하는 일이 한 줄씩 위임하는 DAO라면 그건 그냥 이름만 빌린 DAO다. "DDD를 왜 적용하나요?"는 이 어긋남을 짚는 질문이다.
- **DDD는 도메인이 풍부할 때 의미가 있다.** 웨지의 또 다른 답변에 이 점이 명시돼 있다 — "웹 서비스를 하다보면 구조적으로 비즈니스 로직이 많지 않은 경우가 더러 있어요. 그냥 Json 상하차만 잘 하면 되는 경우가 꽤 있어서요. 이럴 땐 굳이 도메인 중심 코드를 짜는게 손해일 때가 있습니다." DDD를 적용하느냐 마느냐는 도메인의 무게가 정한다.

### 다음 룰

- 새 미션에서 `Repository`/`Service` 클래스를 만들기 전에, **그 클래스가 한 줄 위임 외에 할 일이 있는지** 먼저 묻는다. 없으면 클래스를 안 만든다.
- 도메인 객체에 행위가 없고 게터만 있을 때, 그 핑계가 "트랜잭션 때문" 같은 인프라 핑계인지 자기검증한다. 인프라 핑계는 대개 변명이다.
- "원전대로 정확히"는 *원전이 다루는 문제와 내 문제가 같을 때*만 통한다. 미션 규모의 도메인에 DDD 원전을 그대로 이식하면 패스스루 클래스가 양산된다. 다음엔 도메인의 무게부터 잰다.

---

**참고 자료**

- [Repository (Spring 2.0.x API)](https://docs.spring.io/spring-framework/docs/2.0.x/javadoc-api/org/springframework/stereotype/Repository.html) — 2006년 도입 시점, DDD 인용 없음
- [Repository (Spring 7.0.x API)](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/stereotype/Repository.html) — 현재 Javadoc, DDD 인용 포함
- [Service (Spring 3.1.x API)](https://docs.spring.io/spring-framework/docs/3.1.x/javadoc-api/org/springframework/stereotype/Service.html) — DDD 인용이 처음 등장한 시점
- [PR #382 — woowacourse/spring-roomescape-member](https://github.com/woowacourse/spring-roomescape-member/pull/382) — 이 글의 발단
- [Spring Framework: The Origins of a Project and a Name](https://spring.io/blog/2006/11/09/spring-framework-the-origins-of-a-project-and-a-name/) — Rod Johnson 본인의 회고
- [cbeams/spring-framework-i21](https://github.com/cbeams/spring-framework-i21) — Rod Johnson 2002년 책에 동봉된 `com.interface21.*` 원본 코드 미러
- [Catalog of Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/) — Fowler PoEAA의 Service Layer / Repository 카탈로그
