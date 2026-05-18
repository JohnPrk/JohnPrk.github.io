---
title: "자바 날짜 파서가 2026-02-31을 조용히 받아주는 이유"
category: "spring"
slug: "java-resolverstyle-default-smart"
num: 8
date: 2026-05-18
description: "DateTimeFormatter.ofPattern의 기본 ResolverStyle은 SMART다. 잘못된 날짜를 조용히 보정한다. STRICT로 거부하려면 패턴도 uuuu로 바꿔야 한다."
tags: ["java", "DateTimeFormatter", "ResolverStyle", "우테코"]
---

우테코 레벨2 미션을 진행하다가, 예약 도메인에서 사용자가 입력한 날짜 문자열을 `LocalDate`로 바꾸는 작은 컨버터를 만들었다.

```java
public static LocalDate dateConverter(String date) {
    return LocalDate.parse(date, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
}
```

테스트는 다 통과했다. 그런데 PR 리뷰에서 한 줄이 들어왔다.

> p4 : 테스트도 잘 작성하셨다만 요런 케이스는 다음과 같이 처리됩니다~! `2026-02-31 -> 2026-02-28` 이 케이스는 어떻게 처리할지 고민이 필요해보여요!

`2026-02-31`은 달력에 없는 날짜다. 당연히 `DateTimeParseException`이 던져질 줄 알았는데, 위 코드는 조용히 2월 28일로 보정해서 통과한다는 얘기였다. 직접 돌려보니 정말 그랬다. 왜 그런지, 그리고 어디까지 알아야 다음번에 같은 함정을 안 밟는지 정리한다.

## 발견: 기본 동작이 "보정"이다

`ofPattern("yyyy-MM-dd")`로 만든 포매터에 `2026-02-31`을 넣어 파싱한 결과부터.

```java
@Test
void smart는_2026_2_31을_2_28로_보정한다() {
    DateTimeFormatter smart = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            .withResolverStyle(ResolverStyle.SMART);
    LocalDate parsed = LocalDate.parse("2026-02-31", smart);
    System.out.println("[SMART 2026-02-31] -> " + parsed);
    assertThat(parsed).isEqualTo(LocalDate.of(2026, 2, 28));
}
```

```
[SMART 2026-02-31] -> 2026-02-28
```

테스트 통과. 예외는 던져지지 않는다. 같은 입력을 `LENIENT`로 바꿔보면 또 다른 결과가 나온다.

```java
@Test
void lenient는_2026_2_31을_3_3으로_넘긴다() {
    DateTimeFormatter lenient = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            .withResolverStyle(ResolverStyle.LENIENT);
    LocalDate parsed = LocalDate.parse("2026-02-31", lenient);
    System.out.println("[LENIENT 2026-02-31] -> " + parsed);
    assertThat(parsed).isEqualTo(LocalDate.of(2026, 3, 3));
}
```

```
[LENIENT 2026-02-31] -> 2026-03-03
```

같은 잘못된 날짜가 모드에 따라 서로 다른 정상 날짜로 변환된다. 그러면 기본값은 어느 쪽인가?

## 원리 1: ofPattern의 기본값은 SMART다

`DateTimeFormatter.ofPattern` Javadoc에 한 줄로 박혀 있다.

> The returned formatter has no override chronology or zone. It uses `SMART` resolver style.

즉 `ofPattern("yyyy-MM-dd")`로 만들면 자동으로 SMART가 붙는다. `withResolverStyle`을 호출하지 않으면 조용히 보정하는 모드가 기본이다.

세 모드의 정의는 `ResolverStyle` Javadoc에 분명히 나온다.

### STRICT

> Using strict resolution will ensure that all parsed values are within the outer range of valid values for the field. Individual fields may be further processed for strictness.
>
> For example, resolving year-month and day-of-month in the ISO calendar system using strict mode will ensure that the day-of-month is valid for the year-month, rejecting invalid values.

핵심은 *rejecting invalid values*. 달력에 없는 날은 예외를 던진다.

### SMART

> Using smart resolution will perform the sensible default for each field, which may be the same as strict, the same as lenient, or a third behavior.
>
> For example, resolving year-month and day-of-month in the ISO calendar system using smart mode will ensure that the day-of-month is from 1 to 31, converting any value beyond the last valid day-of-month to be the last valid day-of-month.

핵심은 *converting any value beyond the last valid day-of-month to be the last valid day-of-month*. day-of-month 값이 1부터 31 범위 안에만 있으면, 그 달에 존재하지 않는 31이라도 그 달의 마지막 유효한 일자로 변환한다.

이게 정확히 `2026-02-31`이 `2026-02-28`로 변환되는 메커니즘이다. 2월의 마지막 유효 일자가 28일(평년)이라 거기까지 잘라낸다.

### LENIENT

> Using lenient resolution will resolve the values in an appropriate lenient manner.
>
> For example, lenient mode allows the month in the ISO calendar system to be outside the range 1 to 12. For example, month 15 is treated as being 3 months after month 12.

이쪽은 month 15를 12월에 3개월을 더한 값으로 본다는 의미다. 31일이라는 일자를 자르지 않고 다음 달로 넘긴다. `2026-02-31`은 2월 28일에 3일을 더해 3월 3일. 위 테스트 출력이 정확히 그렇다.

## 실측 매칭: STRICT는 왜 yyyy로는 안 되는가

이제 입력 검증에 쓰려고 `STRICT`로 바꿔봤다.

```java
@Test
void strict_uuuu는_2026_2_31을_거부한다() {
    DateTimeFormatter strict = DateTimeFormatter.ofPattern("uuuu-MM-dd")
            .withResolverStyle(ResolverStyle.STRICT);
    assertThatThrownBy(() -> LocalDate.parse("2026-02-31", strict))
            .isInstanceOf(DateTimeParseException.class);
}
```

```
[STRICT uuuu 2026-02-31 거부 메시지]
Text '2026-02-31' could not be parsed: Invalid date 'FEBRUARY 31'
```

원하던 동작. `Invalid date 'FEBRUARY 31'` 메시지로 명확히 거부한다.

그런데 패턴 글자를 `uuuu`에서 `yyyy`로만 바꾸면 정상 날짜조차 파싱이 깨진다.

```java
@Test
void strict_yyyy는_era가_없으면_정상값도_파싱_실패한다() {
    DateTimeFormatter yStrict = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            .withResolverStyle(ResolverStyle.STRICT);
    assertThatThrownBy(() -> LocalDate.parse("2026-01-01", yStrict))
            .isInstanceOf(DateTimeParseException.class);
}
```

```
[STRICT yyyy 2026-01-01 거부 메시지]
Text '2026-01-01' could not be parsed: Unable to obtain LocalDate from TemporalAccessor:
{YearOfEra=2026, MonthOfYear=1, DayOfMonth=1},ISO of type java.time.format.Parsed
```

여기서 `YearOfEra=2026`이라는 단서가 답을 알려준다. `y` 글자와 `u` 글자는 의미가 다르다. `DateTimeFormatter` Javadoc의 패턴 표.

| Symbol | Meaning      | Examples |
|--------|--------------|----------|
| u      | year         | 2004; 04 |
| y      | year-of-era  | 2004; 04 |

`y`는 year-of-era다. 즉 어떤 기원(era) 안에서의 연도라 연도값만으로는 절대 연도가 결정되지 않는다. ISO 캘린더에서 era는 AD(서기) 또는 BC(기원전)이고, era 정보가 함께 와야 연도가 닫힌다. SMART 모드에서는 era 누락을 기본값 AD로 채워주기 때문에 그냥 통과되지만, STRICT 모드는 그 누락을 채워주지 않고 거부한다. 그래서 STRICT를 쓸 거면 패턴도 `u`로 바꿔야 한다. `u`는 era와 무관한 절대 연도라 단독으로 의미가 닫힌다.

추가로 비윤년 케이스도 확인했다.

```java
@Test
void 비윤년_2025_2_29도_smart는_2_28로_보정한다() {
    DateTimeFormatter smart = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            .withResolverStyle(ResolverStyle.SMART);
    LocalDate parsed = LocalDate.parse("2025-02-29", smart);
    System.out.println("[SMART 2025-02-29] -> " + parsed);
    assertThat(parsed).isEqualTo(LocalDate.of(2025, 2, 28));
}
```

```
[SMART 2025-02-29] -> 2025-02-28
```

2025년은 비윤년이라 2월 29일은 존재하지 않는다. SMART는 또 마지막 유효일로 깎아낸다.

## 종합 표

같은 입력에 모드만 바꿔서 나온 실측을 한 줄로 정리한다.

| 입력 | 패턴 | 모드 | 결과 |
|---|---|---|---|
| `2026-02-31` | `yyyy-MM-dd` | SMART | `2026-02-28` (보정) |
| `2026-02-31` | `uuuu-MM-dd` | STRICT | 예외: `Invalid date 'FEBRUARY 31'` |
| `2026-02-31` | `yyyy-MM-dd` | LENIENT | `2026-03-03` (넘김) |
| `2026-01-01` | `yyyy-MM-dd` | STRICT | 예외: `Unable to obtain LocalDate ... {YearOfEra=2026, ...}` |
| `2025-02-29` | `yyyy-MM-dd` | SMART | `2025-02-28` (보정) |

## 미션에 적용한 코드

위 실측을 본 뒤 컨버터를 다음으로 바꿨다.

```java
public class DateTimeConverter {

    private static final String DATE_FORMAT = "uuuu-MM-dd";
    private static final String TIME_FORMAT = "HH:mm";

    public static LocalDate dateConverter(String date) {
        return LocalDate.parse(date, DateTimeFormatter.ofPattern(DATE_FORMAT)
                .withResolverStyle(ResolverStyle.STRICT));
    }

    public static LocalTime timeConverter(String time) {
        return LocalTime.parse(time, DateTimeFormatter.ofPattern(TIME_FORMAT));
    }
}
```

두 가지가 바뀌었다.

1. 패턴 글자를 `yyyy`에서 `uuuu`로 변경. era 정보 없이도 절대 연도가 닫히도록.
2. `withResolverStyle(ResolverStyle.STRICT)`를 명시. 잘못된 날짜는 예외를 던지도록.

`timeConverter`는 그대로 둔 게 의도적이다. `HH:mm`은 `00:00`부터 `23:59` 범위 안에서 잘못된 값이 자동 보정되는 케이스가 없다. 예컨대 `25:00`은 SMART에서도 예외를 던진다 (위 SMART 정의가 day-of-month에 한정해 보정한다고 한 점과 연결). 그래서 시간 쪽은 굳이 STRICT를 붙이지 않았다.

## 정리

- `DateTimeFormatter.ofPattern`의 기본 ResolverStyle은 **SMART**다. 명시하지 않으면 조용히 보정하는 모드가 적용된다.
- SMART의 핵심은 *converting any value beyond the last valid day-of-month*. `2026-02-31`은 `2026-02-28`로, `2025-02-29`도 `2025-02-28`로 깎아낸다.
- LENIENT는 day overflow를 다음 달로 넘긴다. `2026-02-31`은 `2026-03-03`.
- STRICT는 잘못된 날짜에 예외를 던진다. 다만 `yyyy`는 year-of-era라 era 정보가 없으면 정상 날짜조차 파싱 실패한다. STRICT를 쓸 거면 패턴을 `uuuu`(year)로 바꿔야 한다.
- 외부 입력을 받는 자리라면 디폴트 SMART를 그대로 두면 안 된다. 조용한 보정은 입력 검증의 반대말이다.

## 다음에 쓸 때의 자기 룰

- `DateTimeFormatter.ofPattern(...)`을 새로 만들 때마다 `withResolverStyle(...)`을 같이 적는다. 명시 없이 디폴트에 기대지 않는다.
- 외부 입력을 검증하는 자리는 `STRICT` + `uuuu`.
- 내부에서 자동 생성된 값을 다루는 자리(잘못된 날짜가 올 수 없는 곳)는 `SMART`로 둬도 무방하지만, 그럴 거면 그 가정을 주석 한 줄로 남긴다.
- `LENIENT`는 day overflow를 의도적으로 다음 달로 흘리고 싶을 때만. 안 쓰는 게 디폴트.
