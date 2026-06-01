---
title: "왜 파사드냐는 질문이 매 리뷰마다 돌아왔다: 사실 그건 애플리케이션 서비스였다"
category: "spring"
slug: "facade-vs-application-service"
num: 14
date: 2026-06-01
description: "교차 도메인(예약, 시간, 테마, 대기)을 한 곳에 모은 클래스에 나는 ReservationFacade라는 이름을 붙였다. 서너 번의 리뷰마다 리뷰어는 왜 이걸 파사드로 했냐고 물었다. 같은 질문이 반복된다는 건 코드가 스스로를 설명하지 못한다는 신호, 곧 인지적 비용이라고 생각했다. GoF의 Facade 정의를 원문으로 다시 읽으니 파사드는 결정하지 않고 전달만 하는 패턴이었고, 내 코드는 예약 충돌과 지난 시각을 검증하며 예외를 던지고 트랜잭션 경계까지 쥐고 있었다. Fowler의 Service Layer와 Evans의 Application Layer 정의에 대보니 내가 만든 건 파사드가 아니라 애플리케이션 서비스였다. 이름을 바로잡은 기록이다."
tags: ["디자인 패턴", "파사드", "애플리케이션 서비스", "DDD", "스프링", "우테코"]
---

### 시작점: 교차 도메인을 한 곳에 모으고 "파사드"라 불렀다

우테코 방탈출 미션은 도메인이 넷이다. 예약, 시간, 테마, 그리고 대기. 이 넷은 서로 얽혀 있다. 예약 하나는 "어떤 날짜의, 어떤 시간에, 어떤 테마"라는 한 칸을 차지한다. 대기는 그 예약을 가리킨다. 그래서 "예약을 추가한다"는 단순해 보이는 작업 하나가 실제로는 시간을 찾고, 테마를 찾고, 그 칸이 이미 차 있는지 확인하고, 비어 있을 때만 저장하는 여러 단계로 쪼개진다.

이런 작업을 컨트롤러에 그대로 적으면 컨트롤러가 네 도메인을 전부 알게 된다. 그게 싫어서 나는 교차 도메인 작업만 한 클래스에 모았다. 시간 삭제(사용 중인 예약이 있으면 막아야 한다), 테마 삭제(마찬가지), 예약 추가, 내 예약 변경, 대기 신청, 특정 날짜와 테마의 예약 가능 시간 조회. 컨트롤러는 이 클래스 하나만 호출하면 되도록 만들었다.

그리고 이름을 `ReservationFacade`라고 붙였다. 여러 도메인을 묶어 단순한 창구 하나를 제공한다는 느낌이 "파사드"라는 단어와 잘 맞는다고 생각했다.

### 발견: 매 리뷰마다 돌아온 "왜 파사드냐"

이 구조로 PR을 올리면 리뷰어가 거의 매번 같은 질문을 했다.

> 이건 왜 파사드로 만드셨나요?

서너 번의 리뷰 동안 표현만 조금씩 달랐지 결국 같은 물음이었다. 처음엔 "교차 도메인을 묶는 창구니까요"라고 답하면 됐다. 그런데 같은 질문이 반복된다는 사실 자체가 신경 쓰이기 시작했다.

나는 이걸 **인지적 비용**으로 읽었다. 코드는 코드로 자기를 설명할 수 있어야 한다. 클래스 이름이 "나는 이런 역할이다"라고 정확히 말하고 있으면, 읽는 사람은 이름만 보고 역할을 안다. 거기에 말로 덧붙이는 설명이 필요하다는 건, 이름이 제 역할을 못 하고 있다는 뜻이다. 리뷰어가 매번 "왜 파사드냐"를 물어야 한다면, 그 질문에 내가 답을 다는 비용이 매 리뷰마다 발생한다. 코드가 스스로 못 한 설명을 사람이 대신 치르고 있는 것이다.

그래서 질문을 거꾸로 세웠다. "왜 파사드로 했냐"가 아니라, "파사드가 대체 뭔데 사람들이 자꾸 이걸 묻지?"

### 파사드라는 단어부터: 건물 정면, 그리고 GoF의 정의

파사드(facade)는 원래 건축 용어다. 건물의 정면, 바깥에서 보이는 앞면을 뜻한다. 안쪽 구조가 아무리 복잡해도 길에서 보는 사람은 정면 하나만 본다. 이 비유가 소프트웨어로 넘어온 게 디자인 패턴의 Facade다.

패턴의 원전은 1994년 GoF(Gamma, Helm, Johnson, Vlissides)의 책 `Design Patterns`다. 여기서 Facade의 의도(Intent)는 이렇게 적혀 있다.

> Provide a unified interface to a set of interfaces in a subsystem. Facade defines a higher-level interface that makes the subsystem easier to use.

서브시스템(subsystem)이라는 말부터 풀자. 서브시스템은 여러 클래스가 모여 하나의 기능 묶음을 이루는 것이다. 예를 들어 "결제"라는 기능을 위해 카드사 연동, 한도 확인, 영수증 발행 클래스가 함께 일한다면 그 세 개가 하나의 서브시스템이다. Facade는 그 복잡한 묶음 앞에 **통합된 창구 하나**를 세워, 바깥 클라이언트가 안쪽을 몰라도 쓸 수 있게 한다는 패턴이다. 여기까지는 내가 한 일과 비슷해 보였다.

문제는 그다음이다. GoF는 이 창구가 무슨 일을 하는지도 적어 뒀다. 협력(Collaborations) 항목이다.

> Clients communicate with the subsystem by sending requests to Facade, which forwards them to the appropriate subsystem object(s). ... the facade may have to do work of its own to translate its interface to subsystem interfaces.

핵심은 forwards, 전달이다. 클라이언트가 파사드에 요청을 보내면 파사드는 그걸 적절한 안쪽 객체로 **전달**한다. 파사드가 "자기 일(work of its own)"을 할 때도 있다고 적혀 있지만, 그 일의 정체는 바로 뒤에 못 박혀 있다. "인터페이스를 변환하는 일"이다. 바깥 모양과 안쪽 모양이 안 맞을 때 모양을 맞춰주는 정도지, 새로운 판단을 내리는 게 아니다.

정리하면 GoF Facade의 성질은 이렇다. **파사드는 결정하지 않는다. 전달한다.** "이건 되고 저건 안 된다" 같은 규칙 판단은 파사드의 일이 아니다. 그건 안쪽 객체들의 일이고, 파사드는 그 객체들을 적절한 순서로 부를 뿐이다.

GoF는 Facade의 결과(Consequences)도 셋으로 정리해 뒀는데, 그중 셋째가 나중에 중요해진다.

> It doesn't prevent applications from using subsystem classes if they need to. Thus you can choose between ease of use and generality.

파사드가 있다고 해서 안쪽 클래스를 직접 못 쓰게 막는 게 아니라는 말이다. 쉬운 길(파사드)과 직접 쓰는 길을 둘 다 열어 둔다. 그리고 구현(Implementation) 노트에는 이런 문장도 있다.

> Usually only one Facade object is required.

보통 서브시스템 하나당 파사드 하나면 충분하다는 것. 이 두 문장은 내가 한참 헷갈렸던 "단일 진입점"의 의미를 푸는 열쇠가 되는데, 뒤에서 다시 보겠다.

### 왜 나는 "파사드"를 자연스럽게 떠올렸나: Session Facade의 유산

여기서 한 가지 짚을 게 있다. 나는 왜 트랜잭션을 쥐고 규칙을 검증하는 조율 클래스를 보고 "파사드"라는 단어를 자연스럽게 떠올렸을까. 내가 유별난 게 아니었다. 엔터프라이즈 자바 세계에는 오케스트레이션 클래스를 "Facade"라고 부르는 오래된 관습이 있다.

그 출처가 2001년 Sun의 `Core J2EE Patterns`(Alur, Crupi, Malks)에 실린 **Session Facade**다. 당시 EJB(Enterprise JavaBeans, 자바 서버용 컴포넌트 모델)는 비즈니스 객체가 잘게 쪼개져 있었고, 클라이언트가 그것들을 하나하나 원격 호출하면 비용이 컸다. 그래서 굵은 단위의 세션 빈 하나를 앞에 세워, 여러 객체 호출을 묶고 트랜잭션과 보안 경계까지 그 안에서 처리하게 했다. 이름은 Facade인데 GoF Facade와 달리 **트랜잭션 경계와 비즈니스 흐름**이 그 안에 들어왔다.

여기서부터 "Facade = 트랜잭션을 쥔 오케스트레이터"라는 어법이 자바 진영에 퍼졌다. 내가 `ReservationFacade`라는 이름을 의심 없이 쓴 데에는 이 관습의 영향이 있었던 셈이다. 다만 Session Facade는 EJB 원격 호출이라는 특수한 맥락의 패턴이고, 그 맥락을 떼고 나면 이건 더 일반적인 다른 이름으로 불려야 한다. 그 이름이 뒤에 나온다.

### 내 코드를 GoF 정의에 대보다

이제 "파사드는 결정하지 않고 전달한다"는 GoF의 정의에 내 실제 코드를 대볼 차례다. 예약 추가 메서드는 이렇게 생겼다.

```java
@Transactional
public Reservation addReservation(ReservationRequest request) {
    ReservationTime reservationTime = reservationTimeService.findById(request.timeId());
    Theme theme = themeService.findById(request.themeId());

    Reservation reservation = new Reservation(
            request.name(), request.date(), reservationTime, theme);

    if (reservation.isPast(LocalDateTime.now())) {
        throw new BusinessRuleViolationException(PAST_RESERVATION_REJECTED);
    }

    Reservations existing = reservationService.findByDateAndThemeId(request.date(), theme.getId());
    if (existing.isOccupied(reservationTime)) {
        throw new ConflictException(ALREADY_EXISTS_ADD_RESERVATION);
    }

    return reservationService.addReservation(reservation);
}
```

GoF의 문장과 한 줄씩 대보면 어긋나는 곳이 분명해진다.

첫째, `@Transactional`이 붙어 있다. 트랜잭션은 "이 안의 작업들은 전부 성공하거나 전부 취소되어야 한다"는 경계다. 이 작업 묶음 전체의 성패를 이 클래스가 책임진다는 뜻이다. GoF Facade에는 트랜잭션이라는 개념 자체가 없다. 파사드는 안쪽으로 요청을 전달할 뿐 작업의 성패 경계를 쥐지 않는다.

둘째, `throw`가 둘 있다. 지난 시각이면 거부, 이미 차 있는 칸이면 충돌. 이건 "이건 되고 저건 안 된다"는 **규칙 판단**이다. 물론 판단의 재료가 되는 조건은 도메인 객체가 들고 있다. `reservation.isPast(...)`로 과거인지 묻고, `existing.isOccupied(...)`로 점유 여부를 묻는다. 거기까지는 잘했다. 하지만 "과거면 던진다", "겹치면 던진다"는 정책을 실행하는 건 이 클래스다. 파사드는 결정하지 않는다고 했는데, 이 클래스는 결정하고 있었다.

내 코드를 변호하던 "교차 도메인을 묶는 창구"라는 설명은 절반만 맞았다. 묶는 건 맞다. 하지만 동시에 트랜잭션을 쥐고 규칙을 강제하고 있었다. GoF가 말하는 파사드는 그런 일을 하지 않는다. 리뷰어가 "왜 파사드냐"고 물은 이유가 여기 있었다. 이름은 "나는 그냥 접근을 단순하게 해주는 창구"라고 말하는데, 코드는 "나는 규칙을 강제하고 트랜잭션을 책임진다"고 행동하고 있었다. 이름과 행동의 이 간격이 곧 인지적 비용이었다.

### 그럼 이건 뭔가: Fowler의 Service Layer, Evans의 Application Layer

내가 만든 것에 맞는 이름은 따로 있었다. 두 권위 있는 출처가 거의 같은 시기에 같은 그림을 그려 놓았다.

하나는 2002년 Martin Fowler의 `Patterns of Enterprise Application Architecture`(PoEAA)에 실린 **Service Layer**다. 이 패턴의 본문은 Randy Stafford가 썼다. 정의는 이렇다.

> Defines an application's boundary with a layer of services that establishes a set of available operations and coordinates the application's response in each operation.

애플리케이션의 경계를 정의하고, 가능한 작업의 집합을 세우며, 각 작업마다 응답을 **조율(coordinate)** 한다. "이 앱이 할 수 있는 일들의 목록"을 정하고, 그 일 하나하나를 여러 객체를 불러 가며 진행시키는 층이다. 내가 한 일이 정확히 이것이다.

Fowler는 한 발 더 나아가 Service Layer를 구현하는 두 가지 변종을 구분했다. 하나는 **domain facade**다. 도메인 모델 위에 아주 얇은 막을 씌워 정말 전달만 하는 형태. 이건 사실상 GoF Facade를 도메인에 적용한 것이다. 다른 하나는 **operation script**다. 조율 로직과 검증을 직접 들고 있는 두꺼운 형태. 내 코드처럼 throw가 있고 트랜잭션을 쥐는 건 후자, operation script다. 흥미로운 건, 내가 "파사드"라고 부른 게 사실은 Fowler가 "파사드가 아닌 쪽 변종"으로 분류한 형태였다는 점이다.

다른 하나는 2003년 Eric Evans의 `Domain-Driven Design`(DDD)에 나오는 **Application Layer**다. Evans는 소프트웨어를 UI, Application, Domain, Infrastructure 네 층으로 나누고 Application 층을 이렇게 설명한다.

> This layer is kept thin. It does not contain business rules or knowledge, but only coordinates tasks and delegates work to collaborations of domain objects in the next layer down.

얇게 유지하고, 비즈니스 규칙이나 지식을 담지 않으며, 작업을 조율하고 아래 도메인 객체들의 협력에 일을 위임한다. 여기서 한 가지 긴장이 생긴다. Evans는 "비즈니스 규칙을 담지 말라"는데 내 코드는 throw로 규칙을 강제하고 있지 않은가.

이 긴장의 답은 "규칙의 재료"와 "규칙의 강제"를 나눠 보면 풀린다. 과거인지 판단하는 `isPast`, 칸이 찼는지 판단하는 `isOccupied`는 도메인 객체 안에 있다. 비즈니스 지식은 도메인에 있는 것이다. 다만 "예약과 시간과 테마를 가로지르는 규칙"은 어느 한 도메인 객체의 것이라고 말하기 애매하다. 예약 충돌은 예약만의 일도, 시간만의 일도, 테마만의 일도 아니다. 셋이 만나는 자리의 규칙이다. 이렇게 여러 도메인을 가로지르는 규칙은 자연스러운 단일 주인이 없다. 그래서 그 조율과 강제가 Application 층에 떨어진다. DDD가 Application Service라는 자리를 둔 이유가 바로 이거다. 도메인을 깨끗하게 유지하기 위해, 도메인에 안 어울리는 조율과 트랜잭션을 따로 받아 주는 층.

두 출처가 강조점만 다르다. Fowler는 "경계와 작업 목록"을, Evans는 "도메인을 더럽히지 말 것"을. 하지만 가리키는 대상은 같다. 내가 만든 건 operation script 형태의 Service Layer이자, 얇은 Application Service였다. 이름은 처음부터 정해져 있었던 셈이다. Application Service.

### 강하게 묶인 도메인은 떼는 게 아니라 가둔다

이름을 바꾸기 전에, 나를 가장 막막하게 했던 질문 하나를 마저 풀어야 했다. 이 네 도메인은 서로 너무 강하게 묶여 있는데, 이걸 대체 어떻게 다뤄야 하나.

결합에는 두 종류가 있다. **본질적 결합**은 도메인 자체가 가진 진짜 관계다. 예약이 시간과 테마를 참조하고 대기가 예약을 참조하는 건, 이 시스템이 무엇인지로부터 나오는 관계다. 설계를 잘하든 못하든 사라지지 않는다. **우발적 결합**은 나쁜 설계가 만든 가짜 관계다. 이건 걷어내야 한다.

내 네 도메인의 얽힘은 전부 본질적 결합이었다. 그러니 "어떻게 떼지"는 처음부터 틀린 질문이었다. 떼어지지 않는 걸 떼려 하면 도메인을 부수게 된다. 옳은 질문은 "어떻게 한 곳에 가두지"다. per 도메인 서비스들끼리는 서로를 모르게 두고(예약 서비스가 테마 서비스를 알 필요 없다), 이 본질적 얽힘은 오직 Application Service 한 곳에만 모은다. 결합을 없애는 게 아니라 한 지점에 격리하는 것이 최선이고, 그게 좋은 설계의 정의다.

여기서 GoF의 그 두 문장이 다시 살아난다. 나는 "단일 진입점"을 "앱의 모든 호출이 통과하는 거대한 창구 하나"로 오해하고 있었다. 그래서 "테마와 예약만 쓰는 메서드도 있고 넷 다 쓰는 메서드도 있는데 이게 한 클래스에 있어도 되나"를 고민했다. 하지만 GoF가 말한 단일 진입점은 **서브시스템 하나에 대한 단일 창구**지, 앱 전체의 만능 객체가 아니다. 그리고 "안쪽 클래스를 직접 못 쓰게 막지 않는다"는 셋째 결과처럼, 단일 도메인 작업은 굳이 이 창구를 거칠 필요가 없다.

실제로 내 컨트롤러들은 이미 그렇게 하고 있었다. 시간 추가, 테마 목록, 내 예약 페이지처럼 한 도메인으로 끝나는 작업은 해당 도메인 서비스를 곧장 호출하고, 충돌 검사가 필요한 예약 추가나 대기 신청 같은 교차 도메인 작업만 이 창구를 거쳤다. 단일 도메인 작업까지 창구에 넣었다면 의미 없이 한 번 더 거쳐 가는 패스스루만 생겼을 것이다. 그리고 메서드마다 건드리는 도메인 수가 둘이거나 넷이거나 제각각인 것도 문제가 아니었다. 창구는 서브시스템 전체에 대한 창구고, 각 작업이 그중 일부만 건드리는 건 당연하다.

### 리네임: 이름이 코드를 설명하게

남은 건 이름을 코드에 맞추는 일뿐이었다. 로직은 한 줄도 바꾸지 않았다. 판단은 이미 도메인에 있었고, 조율과 트랜잭션은 이 클래스에 있었다. 구조는 처음부터 Application Service였으니, 할 일은 그 사실을 이름으로 말하게 하는 것뿐이었다.

`roomescape.facade.ReservationFacade`를 `roomescape.application.ReservationApplicationService`로 옮기고 이름을 바꿨다. 패키지도 `facade`에서 `application`으로 옮겨, "이건 per 도메인 서비스보다 한 단계 위에서 조율하는 층"이라는 사실을 패키지 경로로도 드러냈다. 스프링 스테레오타입도 `@Component`에서 `@Service`로 바꿨다. 이건 기능상 차이가 없지만(둘 다 같은 계열이다), 옆에 있는 per 도메인 서비스들이 전부 `@Service`를 쓰고 있어서 의미를 맞췄다. 컨트롤러 넷의 의존 타입과 필드 이름, 단위 테스트의 패키지와 클래스 이름도 함께 따라갔다.

리네임 뒤 전체 테스트는 그대로 통과했다. 행동은 하나도 안 변했으니 당연한 결과다. 변한 건 이름과 위치뿐이다.

그리고 매 리뷰마다 돌아오던 질문이 사라질 자리가 생겼다. 이제 클래스 이름은 "나는 여러 도메인을 가로지르는 작업을 조율하고 트랜잭션을 책임지는 애플리케이션 서비스다"라고 스스로 말한다. 더 이상 "왜 파사드냐"에 사람이 답을 달 필요가 없다. 코드가 코드로 자기를 설명하는 상태, 인지적 비용을 코드 안으로 돌려보낸 상태다.

### 정리

- 파사드는 결정하지 않고 전달한다. GoF의 협력 항목이 forwards라는 단어로 못 박아 둔 성질이다. 트랜잭션을 쥐거나 규칙을 강제하는 순간 그건 더 이상 GoF Facade가 아니다.
- 엔터프라이즈 자바에서 오케스트레이터를 "Facade"라 부르는 관습은 Core J2EE의 Session Facade에서 왔다. 그 이름은 EJB 원격 호출이라는 특수 맥락의 것이고, 그 맥락을 떼면 더 일반적인 이름으로 불려야 한다.
- 여러 객체를 조율하고 트랜잭션 경계를 쥐고 교차 도메인 규칙을 강제하는 층의 이름은 Application Service다. Fowler의 Service Layer(operation script 변종)와 Evans의 Application Layer가 같은 대상을 가리킨다.
- 비즈니스 지식(판단의 재료)은 도메인 객체에 둔다. 여러 도메인을 가로지르는 규칙의 조율과 강제는 단일 주인이 없어서 Application Service로 떨어진다. 도메인을 깨끗하게 두기 위한 자리다.
- 본질적으로 묶인 도메인은 떼는 게 아니라 한 곳에 가둔다. 단일 진입점은 서브시스템 단위의 창구지 앱 전체의 만능 객체가 아니며, 단일 도메인 작업까지 그 창구로 끌어들일 필요는 없다.
- 같은 질문이 리뷰마다 반복된다면 코드가 부족한 게 아니라 이름이 거짓말을 하고 있을 수 있다. 이름과 행동의 간격이 곧 읽는 사람의 비용이다.

### 다음 룰

클래스에 패턴 이름을 붙이기 전에, 그 패턴의 원전 정의 한 문장을 찾아 내 코드에 직접 대본다. 정의의 동사가 "전달한다"인데 내 코드의 동사가 "결정한다"이면, 이름이 틀린 것이다. 이름은 코드가 하는 일을 말해야지, 코드가 하고 싶어 보이는 분위기를 말해선 안 된다.
