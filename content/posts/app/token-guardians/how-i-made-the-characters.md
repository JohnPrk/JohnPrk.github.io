---
title: "캐릭터는 어떻게 만들었나"
category: "app"
slug: "token-guardians/how-i-made-the-characters"
num: 2
date: 2026-06-30
description: "토큰 가디언즈 캐릭터를 제미나이로 만들며 겪은 일관성 문제와, 약 280번의 시도 끝에 알아낸 프롬프트 요령. 토큰 지키미 제작기 2편."
tags: ["토큰 지키미", "제작기", "Gemini", "AI 이미지", "프롬프트", "캐릭터"]
---

미리 말해두면, 이건 약 280번의 시도 끝에 알아낸 내용이다. 원래 아무한테나 알려주면 안 되는 건데, 오늘은 특별히 푼다. (농담이고, 그냥 그만큼 많이 헤맸다는 뜻이다.)

[1편](https://johnprk.github.io/app/token-guardians/why-i-built-it/)에서 토큰 판다를 왜 만들었는지 썼다. 시작은 판다 한 마리였지만, 캐릭터는 여러 개 있었으면 했다. 마침 그때 코덱스에 펫 기능이 생겼고 자체적으로 펫을 만드는 것도 됐는데, 그게 내심 부러웠다. 클로드 계정도 여러 개라 계정마다 다른 캐릭터를 두면 좋겠다 싶었다.

문제는 내가 서버 개발자라는 거였다. 그림을 못 그린다. 그래서 제미나이로 캐릭터를 만들었는데, 막상 해보니 진짜 어려웠던 건 그림 실력이 아니었다. 일관성이었다.

## 일관성이 깨졌다

첫째는 캐릭터끼리 결이 달랐다. 캐릭터를 추가할 때마다 나는 판다를 기준으로 삼았다. 그림을 못 그리니, 매번 자연어로 "얘처럼 만들어줘, 판다랑 톤이나 느낌은 똑같이"라고 부탁하는 식이었다. 고양이를 만들 때도 이렇게 적었다.

> 위의 작화를 가지고 고양이(종 : 페르시안 애기 시절) 캐릭터를 만들어줘
> 판다와 눈 색깔은 똑같아야한다.
> 팬더처럼 털은 표현하지말고
> 판다처럼 광도 똑같이 표현해줘

판다는 매끈한 무광 비닐 느낌이다. 그런데 정작 온 고양이는 털이 보송보송하고 표면에 광이 돌았다. "판다처럼 광도 똑같이"라고 분명히 적었는데도 결이 따로 놀았다.

![왼쪽이 기준으로 삼은 매끈한 판다, 오른쪽이 "판다처럼 해달라"고 했는데도 털이 보이고 광이 돈 고양이](/images/token-guardians/panda-vs-cat.png)

그래서 다시 잡았다.

> 뭔가 광이 나는거 같은데
> 판다처럼 적당히 무광+유광인 느낌으로 해주고

이렇게 한 번 더 적고 나서야 고양이가 판다 옆에 둬도 어색하지 않았다. 일관성을 신경 안 쓴 게 아니다. "판다처럼"이라고 매번 적었는데도, 한 번에 같은 결로 나오는 법이 없었다.

둘째는 한 캐릭터 안에서였다. 캐릭터 하나에 표정과 자세가 여러 개 필요했다. 기본 얼굴, 졸린 얼굴, 지친 얼굴 같은 것들이다. 그런데 앉아 있는 그림인데 서 있는 키랑 크기가 똑같이 나오거나, 표정만 바꿨는데 비율이 틀어져서 같은 캐릭터로 안 보였다.

이 시기에 버린 그림이 정말 많았다. 멀쩡해 보이다가도 하나가 어긋나 있었다.

트리케라톱스가 그랬다. 색이랑 눈에 박힌 별만 살짝 손보고 싶었다. 말로는 어떤 별인지 잘 안 통할 것 같아서, 눈을 캡처해서 같이 보냈다.

![내가 가리킨 "저 별". 오른쪽 눈에 박힌 별 모양 반짝임이다](/images/token-guardians/triceratops-eye-star.png)

> 머리 뒤 쪽 색깔이 다크 그린이나 국방색깔으로 해줄래?
> 그리고 얼굴 색깔을 좀 옅게 해줘
> 그리고 눈에 저 별 쫌 없애줘

![완성처럼 보였지만 머리가 프레임 밖으로 잘려 나간 트리케라톱스. 이런 컷은 그냥 버렸다](/images/token-guardians/triceratops-broken.png)

색만 바꿔달라고 했는데 머리가 프레임 위로 잘려서 돌아왔다. 손도 안 댄 구도까지 같이 틀어진 거다. 얼굴은 멀쩡한데 딱 한 군데가 어긋나서 통째로 버려야 하는 게 제일 아쉬웠다.

## 작은 수정이 안 됐다

제일 답답했던 건 조금만 고치고 싶을 때였다. 어디 하나 손을 대면 결과가 통째로 바뀌어서 돌아왔다.

강아지가 그랬다. 처음엔 꽤 괜찮게 나왔다. 판다, 고양이와 같은 3D 느낌으로 갈색 강아지가 나왔다. 그런데 괜찮으면서도 뭔가 아쉬워서, 조금만 다르게 해보고 싶어 이렇게 쳤다.

> 뭔가 괜찮은거 같으면서도 아쉬워
> 다른 느낌으로 바꿔줄래?

![왼쪽이 원래 나온 3D 강아지(before), 오른쪽이 "다른 느낌으로" 한마디에 수채화로 바뀐 강아지(after)](/images/token-guardians/dog-before-after.png)

톤만 살짝 손보려던 거였는데 화풍이 통째로 수채화로 바뀌어서 돌아왔다. 아예 다른 그림이 된 거다.

표정 작업도 똑같았다. 표정 하나만 고쳐달라고 하면 멀쩡하던 다른 표정까지 같이 바뀌어 있었다. 그래서 매번 "기존의 sleep이랑 dead는 안 건드렸으면 좋겠어", "나머지는 건들지 말고 아래 것만 수정해줘" 같은 말을 붙여야 했다.

이미지를 잘라 쓰는 단계에서는 픽셀이 깨지기도 했다. 캐릭터 한 장을 8개로 잘라 배경을 지우는데, 다른 캐릭터는 멀쩡한데 펭귄만 테두리가 계단처럼 깨졌다. 펭귄이 채도가 낮은 회색에 어두운 외곽선까지 있어서, 잘라내는 과정에서 그 경계가 도드라졌던 거다. 이렇게 깨지면 캐릭터를 다시 뽑기도 했다.

한계도 있었다. 강아지처럼 주둥이가 긴 캐릭터는 잘 못 나온다기보다, 내 캐릭터들 특유의 느낌이랑 잘 안 맞았다. 그리고 처음엔 벡터 SVG로 만들려고 했는데, 제미나이가 그건 제대로 못 뱉어서 래스터 이미지로 방향을 틀었다.

## 결국 알게 된 건 하나였다

이 짓을 약 280번 반복했다. 그중 110번쯤은 "아니 이거 말고", "다시", "왜 이렇게 나와" 같은 수정 요청이었다. 그렇게 부딪히다 결국 하나를 알게 됐다.

제미나이한테는 영어로, 그리고 아주 명시적으로, 원하는 걸 일일이 다 적어줘야 제대로 만들어준다는 거다. "귀여운 햄스터 표정 8개" 정도로 두루뭉술하게 던지면 매번 다른 게 나온다. 털색, 눈 모양, 코, 몸 비율, 렌더 스타일, 8개를 어떻게 배치할지까지 하나하나 박아야 한다.

그 긴 프롬프트를 내가 직접 영어로 쓰진 않았다. 클로드한테 "제미나이에 줄 프롬프트를 짜줘"라고 시켰다. 그러면 두 종류의 프롬프트가 나왔다. 하나는 캐릭터 한 마리를 만드는 프롬프트, 다른 하나는 그 캐릭터의 표정 여덟 개를 한 장에 만드는 프롬프트다. 길어서 접어둔다. 펼쳐 보면 거의 잔소리 수준이라는 걸 알 수 있다.

<details>
<summary>펼쳐보기: 캐릭터 한 마리 만드는 프롬프트 (병아리 예시)</summary>

```text
Create a single cute 3D vinyl-toy figure of a chibi baby chick (duckling), collectible
style, smooth soft matte clay finish (no rough texture). Adorable and slightly derpy ("하찮은").

PROPORTIONS (match exactly, head-dominant 2-head-tall chibi):
- The whole figure is only about TWO heads tall.
- Build the figure as TWO clearly SEPARATE rounded masses stacked vertically:
  a big round HEAD on top and a smaller rounded BODY below, with a visible
  gentle pinch / indentation (a short neck) between them, like the reference
  panda, cat and hamster. Do NOT blend head and body into one continuous egg.
- The HEAD is the dominant ball: about HALF the total height and clearly WIDER
  and bigger than the body. Top-heavy and cute.
- The BODY is a distinctly smaller rounded belly sitting under the head,
  noticeably narrower than the head. NOT taller than the head, no long torso.
- Wings are tiny short stubs at the sides of the body; legs are very short stubs
  with small rounded feet at the very bottom.

OUTPUT QUALITY (avoid banding / pixel artifacts):
- Clean high-resolution PNG, no JPEG compression.
- No wide soft low-contrast gradients across large flat areas.
- Crisp clean color regions with subtle but defined shading; no posterization.

SILHOUETTE CHECK:
- From the outline alone you should clearly read a big head-ball and a separate
  smaller body-ball with a soft waist between them, exactly like the existing
  panda/cat/hamster figures.

FACE & EXPRESSION:
- Flat round chibi face. Innocent, slightly smug-content stare.
- MEDIUM round glossy solid-black eyes, one bright catchlight + tiny sparkle.
  NO white sclera.
- A small soft rounded orange beak, slightly open in a derpy way.
- A tiny tuft of fluff sticking up on top of the head.

HEAD & BODY MARKINGS:
- Even soft butter-yellow fluff over the whole head and body.
- Cheeks and belly a touch lighter warm cream-yellow for soft depth.
- Beak and feet warm soft orange.
- All yellow/cream boundaries SOFT-EDGED but DEFINED, narrow transition only,
  no long fade, no hard grooves or dark seams.

BODY & POSE:
- Big round head-ball on top, smaller rounded body-ball below with a soft waist.
- Tiny stub wings at the sides, short stub legs with small rounded orange feet.
- NO tail. Standing upright facing forward, waddly and clumsy, top-heavy.

COLOR (raised contrast to prevent banding):
- Yellow areas: clean warm butter-yellow, saturated enough to read on a dark bg.
- Beak/feet: clean soft orange.
- Eyes: solid black with bright glossy catchlights.
- Yellow-vs-orange contrast clear and crisp; no muddy gray midtones.

LIGHTING & FINISH:
- Soft front studio lighting with gentle, well-defined shading.
- Smooth matte vinyl finish, faint highlight on the cheeks/belly and faint
  specular sheen on the fluff to add micro-detail.

COMPOSITION:
- SQUARE 1:1. One chick only, centered, filling most of the frame.
- Plain solid dark slate background (slightly lifted from pure black), no gradient.
- No accessories or props, no text, no logo, no ground shadow.
```

</details>

<details>
<summary>펼쳐보기: 표정 여덟 개 시트 만드는 프롬프트 (햄스터 예시)</summary>

```text
Using the hamster character in the attached image as the exact reference, create a single expression sheet showing this SAME hamster in 8 different emotional states. Keep the character's identity perfectly consistent across all 8: the same soft pastel-orange and cream fur, the same big round glossy black eyes, the tiny pink heart-shaped nose, the same chubby rounded body proportions, and the same smooth matte 3D clay / soft-vinyl-toy render style with gentle studio lighting.

Layout: arrange the 8 poses in a grid, 3 on the top row, 3 on the middle row, 2 on the bottom row. Each pose fully isolated on a transparent background (or pure solid white if transparent is unavailable). No text, no labels, no shadows on the ground, even spacing.

The 8 states:
1. Playful wink: one eye closed in a happy upward arc, gentle smile, a small yellow star floating beside the head.
2. Default happy: standing, both glossy eyes open, soft content smile (the neutral idle pose).
3. Slightly worried: neutral mouth, one small blue sweat drop near the side of the head.
4. Anxious: two blue sweat drops, both little hands clasped together nervously in front of the chest, uneasy expression.
5. Sleepy yawn: eyes closed, mouth open wide in a round yawning "o", standing.
6. Sleeping: lying down on its side, eyes closed in soft curved happy lines, peaceful, tiny mouth.
7. Knocked out / dizzy: sitting, both eyes drawn as "X X", small tongue sticking out, dazed.
8. Relaxed sitting: seated with legs forward and paws visible, both eyes open, gentle smile.

Maintain identical scale, lighting direction, and art style for every pose so they look like one cohesive sticker/emote set.
```

</details>

이렇게 털색, 눈, 코, 비율, 렌더 스타일, 배치까지 일일이 다 박고, 기존 캐릭터를 정확한 레퍼런스로 붙여주니, 표정 여덟 개가 한 장에 일관되게 나왔다.

![토큰 지키미 캐릭터들의 표정 8종](/images/token-guardians/hamster-expressions.png)

뒤에는 이 한 장을 8개로 자르고 정렬하는 작업까지 손으로 안 하고 스킬로 자동화했다. 같은 시트를 넣으면 늘 같은 결과가 나오게 만들었다.

## 그래서 가디언즈가 됐다

결국 AI로 캐릭터를 만든다는 건 내가 직접 그리는 게 아니었다. 이상한 데를 찾아내서 말로 스펙을 좁혀가는 반복에 가까웠다. 그렇게 판다 한 마리가 고양이, 강아지, 햄스터, 펭귄으로 늘었고, 앱 이름도 "토큰 가디언즈"가 됐다.

다음 편에서는 이 앱을 윈도우에서도 돌리려다 프레임워크를 통째로 갈아엎은 이야기를 쓸 생각이다.
