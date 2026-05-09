---
title: "Repository와 DAO, 둘 다 두지 않기로 했다 — Aggregate Root와 도메인 협력으로 돌아가서"
category: "spring"
slug: "repository-dao-aggregate-root"
num: 2
date: 2026-05-09
description: "직전 글에서 \"어노테이션의 DDD 인용은 사후, 3계층은 J2EE 흐름의 관례화\"라는 결론을 잡고 나니, 막상 PR 코드를 어떻게 고쳐야 할지가 새로운 막막함이었다. \"DAO는 테이블, Repository는 도메인이라고 내가 정하고 쓰자\"는 본능적인 안에서 출발해 — Aggregate Root 룰과 도메인 협력 모델을 만나 코드를 다시 짜기까지의 기록."
tags: ["스프링", "DDD", "Repository", "Aggregate", "객체지향", "우테코"]
---

### 시작점 — 결론을 잡고 나서 더 막혔다

직전 글에서 `@Repository`/`@Service` Javadoc의 DDD 인용이 어노테이션 도입 5년 뒤에 사후 추가됐고, Controller-Service-Repository 3계층은 DDD가 아니라 J2EE 패턴 운동이 Spring을 통해 굳어진 관례라는 결론을 잡았다. 거기서 글은 끝이지만 내 PR은 그대로 남아 있었다. 결론을 안다고 코드가 고쳐지는 건 아니다. 오히려 "원저자의 의미가 없어진 기분"이 들었다 — DDD 원전대로 적용하지 말라는 게 정답이라면 그러면 어떻게 짜야 하나.

본능적으로 잡은 첫 안은 단순했다.

> DAO는 테이블 기반이고, Repository는 도메인 기반이라고 그냥 내가 정하고 쓰자.

이 안이 개념적으로 틀린 건 아니다. PoEAA의 *Data Mapper*(테이블 ↔ 객체 변환)와 *Repository*(도메인 컬렉션처럼 다루기)의 구분이 정확히 그렇다. 그런데 안을 잡고 PR 코드를 들여다보니 한 가지가 마음에 걸렸다 — 미션 규모에서 *둘 다 클래스로 두는 게* 의미가 있나. 내 코드는 이렇게 생겨 있었다.

```java
@Component
public class ReservationRepository {
    private final ReservationDao reservationDao;

    public ReservationRepository(ReservationDao reservationDao) {
        this.reservationDao = reservationDao;
    }

    public List<Reservation> findAll() { return reservationDao.findAll(); }
    public Long save(Reservation r) { return reservationDao.save(r); }
    public void deleteById(Long id) { reservationDao.deleteById(id); }
    public boolean existsByTimeId(Long t) { return reservationDao.existsByTimeId(t); }
    public Optional<Reservation> findById(Long id) { return reservationDao.findById(id); }
    public boolean existsByThemeId(Long th) { return reservationDao.existsByThemeId(th); }
    public boolean existsBy(LocalDate d, Long t, Long th) { return reservationDao.existsBy(d, t, th); }
    public Set<Long> findReservedTimeIdsByDateAndThemeId(LocalDate d, Long th) {
        return reservationDao.findReservedTimeIdsByDateAndThemeId(d, th);
    }
}
```

8개 메서드가 전부 한 줄 위임. 웨지가 정확히 그 자리를 짚었다.

> 레이어드를 적용하다보면 100% 규칙에 맞출수는 없습니다. 대략 70% 정도는 들어맞고, 30% 정도는 아무것도 없이 위임을 하는 코드가 되면 어느정도 성공인데요. 구현하신 내용에서는 100% 위임을 하고 있으니 실익이 없는 코드이고, 기계적인 패턴 적용으로 안티패턴입니다.

그러면 둘 중 하나를 없애야 한다. 어느 쪽을 남기고 어느 쪽을 흡수할까.

### 이름이 마인드를 끈다 — 그래서 Repository를 남기기로

처음에는 "DAO에서 Repository 역할까지 다 하면 되겠네"라고 생각했다. 어차피 클래스 한 개에 `JdbcTemplate`을 부르는 똑같은 코드가 되니 이름이 뭐든 상관없을 거라 본 거다. 그런데 한 가지가 마음에 걸렸다 — *클래스 이름이 마인드를 끈다.*

`ReservationDao`라고 쓰면 자연스럽게 메서드가 `selectByDate(...)`, `insertReservation(...)` 같은 SQL 대응으로 흘러간다. `ReservationRepository`라고 쓰면 `findReservationsOn(LocalDate)`, `save(Reservation)` 같은 도메인 어휘로 흘러간다. 코드는 어차피 같은 형태로 나오지만, *작성하는 사람의 시야가 다르다.* DDD가 말하는 "도메인 컬렉션처럼 다루기"는 결국 이 시야를 잡는 일이고, 그 시야를 가장 단순하게 끌어주는 게 클래스 이름이다.

그래서 합치되 이름은 **`Repository`로 남기기로** 했다. `Dao`는 흡수해서 삭제. 본능적으로 잡았던 첫 안("DAO는 테이블, Repository는 도메인")의 정신은 살리되, 그 두 정신을 *한 클래스 안에 통합*하는 형태.

### 그러다 막힌 세 자리

방향은 잡았는데 또 막혔다. 세 가지가 동시에 헷갈렸다.

**(1) JOIN의 대칭성과 Repository의 비대칭성**
SQL JOIN은 집합 연산이라 `reservation JOIN times`나 `times JOIN reservation`이나 결과가 같다. 그러면 `ReservationRepository`에 그 쿼리를 두든 `ReservationTimeRepository`에 두든 결과는 같을 텐데, 그러면 *어느 Repository에 붙이느냐*의 의미는 뭐지?

**(2) `Reservation`은 FK를 들고 있는데도 root가 될 수 있나**
`Reservation`은 `theme_id`, `time_id`, `member_id` 같은 FK를 가진다. 그러면 그건 자기 정체성이 약한 종속 객체 아닌가? 독립적인 Aggregate가 될 수 있나?

**(3) 데이터 조합이 일어나는 도메인은 어디로 가나**
"이 날짜에 이 테마에 예약 가능한 시간 목록"처럼 *시간 + 예약여부*가 합쳐진 도메인 개념은 어느 Repository가 책임지나?

이 세 자리를 한 번에 풀어준 게 DDD의 **Aggregate Root** 개념이었다.

### Aggregate Root — 세 자리가 동시에 풀린다

Evans의 *Domain-Driven Design* (2003)은 Aggregate를 이렇게 정의한다.

> Aggregate: a cluster of associated objects that we treat as a unit for the purpose of data changes. Each aggregate has a root and a boundary. Within an aggregate, one ENTITY is designated as the root.

그리고 Repository에 대한 룰은 한 줄이다.

> Provide repositories only for AGGREGATE ROOTS that actually need direct access.

**"Aggregate Root 하나당 Repository 하나"** — 이게 (1)에 답한다. JOIN이 SQL 차원에서 대칭이어도, *도메인 차원에선 누가 누구를 소유하느냐*의 비대칭이 있다. `Reservation`이 `ReservationTime`을 *가지는* 거지 그 반대가 아니다. JOIN은 데이터 평면, Repository는 도메인 평면 — 두 평면이 항상 1:1로 맞을 필요는 없다.

(2)에 대해서는 — FK를 가져도 Aggregate Root가 될 수 있다. 기준은 *자기 정체성과 일관성 규칙을 본인이 가지느냐*. `Reservation`은 자기 ID로 독립 조회되고, "같은 날짜·시간·테마에 중복 예약 안 됨" 같은 일관성 규칙을 자기 안에서 책임진다. 그래서 root다. 내 도메인에선 `Reservation`, `Theme`, `ReservationTime` 셋 다 각자 root고, 그래서 `ReservationRepository`, `ThemeRepository`, `ReservationTimeRepository` 세 개가 정당화된다.

그리고 Vernon의 *Implementing Domain-Driven Design* (2013)이 추가 룰 하나를 준다.

> Reference Other Aggregates By Identity. Prefer references to external Aggregates only by their globally unique identity, not by holding a direct object reference (or "pointer") to them.

다른 Aggregate는 객체가 아니라 ID로 참조하는 게 정통. 내 `Reservation`은 현재 `Theme theme`, `ReservationTime time`을 객체로 들고 있는데, 미션 규모에선 편의상 그렇게 두고 — *(b)는 편의성 타협이고 (a)가 정통이라는 점을 알고 쓰는 것*만 차이가 된다.

### 웨지가 가리킨 자리 — 도메인 협력

(3) "조합이 일어나는 자리"에 대한 답은 웨지의 코멘트가 가장 정확했다.

> reservationService니까 Reservation 컬렉션을 응답했으면 "TimeAvailability"라는 도메인적으로 객체간 협력할 수 있는 여지가 생기고, 해당 도메인을 중심으로 캡슐화가 일어나겠죠. 예를 들어 Reservations가 컬렉션 일급 객체가 있고 reservations.findOccupiedTimes() 같은 메서드를 활용한다던지요.

JOIN으로 묶어서 새 객체를 만드는 게 아니라, **각 Repository가 자기 root만 반환하고 도메인 객체끼리 협력하게** 하는 형태. 내 코드가 `Set<Long> reservedTimeIds`를 facade에 넘겨서 `contains()`로 비교하던 자리가 여기서 도메인 협력으로 바뀐다. 그러면 데이터를 빼서 비교하던 절차지향이 *객체에게 묻기*로 바뀐다.

### 코드 다시 짜기 — 3단계

방향이 잡혔으니 PR 코드를 다시 짠다. 세 단계로 나눴다.

#### Step 1. `ReservationRepository`에 `Dao` 흡수

Before는 위에서 보여준 100% 위임 클래스. After는 `JdbcTemplate`을 직접 받고, 기존 `ReservationDao`의 RowMapper와 SQL을 흡수한다. 어노테이션도 `@Component`에서 **`@Repository`로** 바꾼다 (이름·의미 일치 + persistence exception translation 자동 활성화).

```java
@Repository
public class ReservationRepository {

    private final JdbcTemplate jdbcTemplate;

    public ReservationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final String SELECT_BASE = """
            SELECT r.id as reservation_id, r.name, r.date,
                   t.id as time_id, t.start_at as time_value,
                   th.id as theme_id, th.name as theme_name,
                   th.description as theme_description,
                   th.thumbnail_image_url as theme_thumbnail
            FROM reservation as r
            INNER JOIN reservation_time as t ON r.time_id = t.id
            INNER JOIN theme as th ON r.theme_id = th.id
            """;

    private final RowMapper<Reservation> rowMapper = (rs, rowNum) -> {
        ReservationTime time = new ReservationTime(
                rs.getLong("time_id"),
                rs.getTime("time_value").toLocalTime()
        );
        Theme theme = new Theme(
                rs.getLong("theme_id"),
                rs.getString("theme_name"),
                rs.getString("theme_description"),  // alias와 일치
                rs.getString("theme_thumbnail")      // alias와 일치
        );
        return new Reservation(
                rs.getLong("reservation_id"),
                rs.getString("name"),
                rs.getDate("date").toLocalDate(),
                time, theme
        );
    };

    public Reservations findAll() {
        return new Reservations(jdbcTemplate.query(SELECT_BASE, rowMapper));
    }

    public Reservations findOn(LocalDate date, Long themeId) {     // ← 새 메서드
        String sql = SELECT_BASE + " WHERE r.date = ? AND r.theme_id = ?";
        return new Reservations(jdbcTemplate.query(sql, rowMapper, date, themeId));
    }

    // save / deleteById / findById / existsBy... 동일
}
```

`ReservationDao.java`는 통째로 삭제. 같은 변경을 하면서 웨지가 따로 지적했던 RowMapper alias 문제(`description`/`thumbnail_image_url`로 가져오던 자리 → `theme_description`/`theme_thumbnail`로 alias와 일치)도 같이 풀린다. 그리고 `findReservedTimeIdsByDateAndThemeId(): Set<Long>`이라는 *데이터 평면의 메서드*가 사라지고, `findOn(date, themeId): Reservations` — *도메인 컬렉션을 반환하는 메서드*로 대체된다.

#### Step 2. `Reservations` 일급 컬렉션 신설

웨지가 가리킨 도메인 객체를 만든다.

```java
package roomescape.domain;

public class Reservations {

    private final List<Reservation> values;

    public Reservations(List<Reservation> values) {
        this.values = List.copyOf(values);
    }

    public List<Reservation> values() {
        return values;
    }

    public boolean isOccupied(ReservationTime time) {
        return values.stream()
                .anyMatch(r -> r.getTime().getId().equals(time.getId()));
    }

    public Set<Long> occupiedTimeIds() {
        return values.stream()
                .map(r -> r.getTime().getId())
                .collect(Collectors.toUnmodifiableSet());
    }
}
```

핵심은 마지막 두 메서드. **컬렉션이 자기에 대한 질문에 직접 답한다.** 호출자가 `Set<Long>`을 들고 다니면서 `contains()`를 부를 필요가 사라진다.

#### Step 3. `ReservationFacade` 도메인 협력으로

Before는 `Set<Long>`을 service에서 가져와 stream으로 매핑하는 절차지향 코드.

```java
public List<TimeWithStatusResponse> getTimesWithAvailability(LocalDate date, Long themeId) {
    List<ReservationTime> times = reservationTimeService.getReservationTimes();
    Set<Long> reservedTimeIds = reservationService.findReservedTimeIdsByDateAndThemeId(date, themeId);

    return times.stream()
            .map(time -> TimeWithStatusResponse.from(time, reservedTimeIds.contains(time.getId())))
            .toList();
}
```

After는 `Reservations` 도메인 객체에게 묻는 형태.

```java
public List<TimeWithStatusResponse> getTimesWithAvailability(LocalDate date, Long themeId) {
    List<ReservationTime> times = reservationTimeService.getReservationTimes();
    Reservations reservations = reservationService.findOn(date, themeId);

    return times.stream()
            .map(time -> TimeWithStatusResponse.from(time, reservations.isOccupied(time)))
            .toList();
}
```

차이가 두 줄밖에 안 나오는데 의미가 크다. `time.getId()`를 꺼내 비교하던 자리가 `reservations.isOccupied(time)`로 바뀌면서 **데이터를 빼서 비교가 객체에게 묻기로** 바뀐다. `Set<Long>`이라는 데이터 평면의 자료구조는 *호출자에게 노출되지 않고* 컬렉션 안에 캡슐화된다.

### 한 번에 풀린 것들

이 세 단계로 웨지가 PR에 남긴 결정타 코멘트들이 한꺼번에 처리된다.

- "100% 위임은 안티패턴, DDD를 왜 적용하나요" → 위임 클래스 자체가 사라짐
- "repository를 도메인 컬렉션이라고 접근하라" → `Reservations` 일급 컬렉션 + `isOccupied(time)` 협력
- "alias 선언과 rowMapper 구현을 맞춰주세요" → Step 1에서 동시 수정
- "Set<Long>을 반환하는 설계는 facade에서 절차지향적으로 처리하기 위해 의도된 거에요" → `Reservations` 반환으로 전환

남은 자리는 하나 — `Reservation` 자체가 게터만 가진 **Anemic Domain Model**이라는 지적. 이건 더 깊은 변경이라 이번 리팩토링 범위 밖에 두기로 했다. `Reservation.canBeAddedTo(Reservations existing)` 같이 *중복 예약 검증을 도메인이 책임지는* 형태로 가야 진짜 풍부한 도메인이 되는데, 거기까지 가는 건 다음 사이클에서.

### 정리

이번 리팩토링에서 알게 된 것들을 짧게 적어둔다.

- **클래스 이름이 마인드를 끈다.** 같은 코드라도 `Dao`라고 쓰면 SQL 어휘로, `Repository`라고 쓰면 도메인 어휘로 메서드가 흘러간다. 두 클래스를 합칠 때 어느 이름을 남길지가 단순한 취향 문제가 아니다.
- **JOIN은 데이터 평면, Repository는 도메인 평면.** 두 평면이 항상 1:1로 맞을 필요는 없다. JOIN의 SQL 대칭성이 Repository의 비대칭성과 충돌하는 게 아니라, *서로 다른 평면에 있는 것*이다.
- **Aggregate Root 룰이 Repository 위치를 정한다.** "어느 root냐"는 *자기 정체성과 일관성 규칙을 본인이 가지느냐*로 정해지고, FK를 가졌다고 root가 못 되는 건 아니다.
- **데이터 조합은 JOIN이 아니라 협력으로 표현하는 게 정통.** 각 Repository가 자기 root만 반환하고, 도메인 객체끼리 묻고 답하게 만든다. `Set<Long>` 같은 데이터 자료구조가 *호출자에게* 노출되는 자리가 보이면 거기에 도메인이 빠진 것이다.
- **DDD가 빛나는 자리는 클래스 분리가 아니라 도메인 객체에 행위가 모이는 자리.** 이번 리팩토링은 절반만 한 셈이다 — Repository는 정리됐지만 `Reservation`은 여전히 게터 가방이다. 다음 사이클에서 거기에 행위를 채워야 진짜 도메인 모델이 된다.

### 다음 룰

- 새 미션에서 `Repository`/`Service`/`DAO` 클래스를 만들기 전에, **그 클래스가 한 줄 위임 외에 할 일이 있는지** 먼저 묻는다. 없으면 클래스를 안 만든다.
- 도메인 컬렉션을 반환할 때 *그 안의 데이터 자료구조*(`Set<Long>` 같은)를 외부로 흘려보내지 않는다. 외부에 노출돼야 할 것은 도메인 객체에게 묻는 메서드뿐.
- 다른 Aggregate는 가능하면 ID로 참조한다. 객체로 들고 있으면 편하지만 *편의성 타협*이라는 걸 의식하고 쓴다.
- "원전대로 정확히"는 *원전이 다루는 문제와 내 문제가 같을 때*만 통한다. 미션 규모의 도메인에 DDD 원전을 그대로 이식하면 패스스루 클래스가 양산된다 — 본인이 도메인의 무게를 먼저 잰 다음 적용한다.

---

**참고 자료**

- [PR #382 — woowacourse/spring-roomescape-member](https://github.com/woowacourse/spring-roomescape-member/pull/382) — 이 글의 발단. 웨지의 결정타 코멘트들이 다 여기 있음.
- [Domain-Driven Design Reference (Evans, 2015)](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) — Evans 본인이 무료로 공개한 핵심 정의 모음. Aggregate, Aggregate Root, Repository를 한 페이지씩.
- Evans, *Domain-Driven Design* (2003), 6장 "The Life Cycle of a Domain Object" — Aggregate와 Repository가 같은 장에 묶여 있는 이유.
- Vaughn Vernon, *Implementing Domain-Driven Design* (2013), 10장 "Aggregates" — 실용적인 Aggregate 설계 룰 4가지(작게 유지, root 통해서만 참조, 다른 aggregate는 ID로 참조, eventual consistency).
- [Catalog of Patterns of Enterprise Application Architecture — Fowler](https://martinfowler.com/eaaCatalog/) — *Data Mapper* vs *Repository* 구분의 원전.
- [직전 글 — 스프링은 DDD에서 영감을 받았을까](/spring/spring-annotation-ddd-myth/) — 이 글의 전제가 되는 시간선 정리.
