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

그래서 이 글은 잘 만든 자랑보다, 캐릭터를 만들며 겪은 실패담에 가깝다.

## 판다처럼 만들고 싶은데 비슷하게 잘 안 만들어졌다

지금 와서 보면 판다는 운이 좋았다. 별생각 없이 만들었는데 한 번에 꽤 이쁘게 나왔다. 문제는 이 판다를 닮은 캐릭터를 여럿 만들려고 하면서 시작됐다.

캐릭터끼리 결이 달랐다. 캐릭터를 추가할 때마다 나는 판다를 기준으로 삼았다. 그림을 못 그리니, 매번 자연어로 "얘처럼 만들어줘, 판다랑 톤이나 느낌은 똑같이"라고 부탁하는 식이었다. 고양이를 만들 때도 이렇게 적었다.

> 위의 작화를 가지고 고양이(종 : 페르시안 애기 시절) 캐릭터를 만들어줘
> 판다와 눈 색깔은 똑같아야한다.
> 팬더처럼 털은 표현하지말고
> 판다처럼 광도 똑같이 표현해줘

판다는 매끈한 무광 비닐 느낌이다. 그런데 정작 온 고양이는 털이 보송보송하고 표면에 광이 돌았다. "판다처럼 광도 똑같이"라고 분명히 적었는데도 결이 따로 놀았다.

![왼쪽이 기준으로 삼은 매끈한 판다, 오른쪽이 "판다처럼 해달라"고 했는데도 털이 보이고 광이 돈 고양이](/images/token-guardians/panda-vs-cat.png)

이 당시만 해도 클로드한테 프롬프트를 통째로 맡기던 때는 아니었다. 자연어로 "이렇게 해줘"를 반복하며 여러 시행착오를 겪었다.

이 한 마리가 나오기까지, 나의 실패한 습작들은 다음과 같다. 각 그림 밑에 그때 친 스크립트를 같이 뒀다.

![색이 파랗게, 온몸이 털로, 다시 판다로, 광이 번들거리고, 색이 너무 어둡게 나온 습작들. 각 그림 밑에 그때 친 스크립트를 함께 넣었다](/images/token-guardians/cat-failures.png)

정확히 기억은 안 나지만, 나중엔 클로드한테 스크립트를 고치게 하고 제미나이로 결과를 뽑는 걸 반복해서 확인한 끝에, 겨우겨우 두 번째 캐릭터인 고양이를 만들었다.

![털 없이 매끈하고 무광과 유광이 적당히 섞여서 판다 옆에 둬도 결이 맞은 최종 고양이](/images/token-guardians/cat-final.png)

## 조금만 수정하고 싶었는데 아예 다시 그렸다

제일 답답했던 건 조금만 고치고 싶을 때였다. 어디 하나 손을 대면 결과가 통째로 바뀌어서 돌아왔다. 사실 앞에서 본 고양이도 같은 경우였다. "적당히 무광+유광으로" 같은 작은 수정을 넣을 때마다, 그 부분만 바뀌는 게 아니라 매번 다른 고양이가 돌아왔다.

강아지에서는 그게 더 대놓고 드러났다. 처음엔 꽤 괜찮게 나왔다. 판다, 고양이와 같은 3D 느낌으로 갈색 강아지가 나왔다. 나쁘지 않은데 뭔가 조금 아쉬웠다. 그래서 이 결과가 마음에 든 상태에서, 이어서 바로 작은 요청 하나만 더 얹었다.

> 뭔가 괜찮은거 같으면서도 아쉬워
> 다른 느낌으로 바꿔줄래?

![왼쪽이 원래 나온 3D 강아지(before), 오른쪽이 "다른 느낌으로" 한마디에 수채화로 바뀐 강아지(after)](/images/token-guardians/dog-before-after.png)

톤만 살짝 손보려던 거였는데, 돌아온 건 화풍이 통째로 수채화로 바뀐 강아지였다. 아예 다른 그림이 된 거다.

고양이든 강아지든 늘 이런 식이었다. 어디 한 군데만 고쳐달라고 하면, 그 부분만 바뀌는 게 아니라 그림 전체가 다른 그림으로 돌아왔다. 처음엔 왜 이러는지 몰랐다. "왜 안 되지?" 하면서 프롬프트를 이리저리 바꿔봤지만, 특정 부분만 고치는 건 계속 안 됐다.

나중에 알게 된 원리는 이랬다. 이미지 생성 모델은 기존 그림에서 그 부분만 덧칠해 돌려주는 게 아니다. "여기만 바꿔줘"라고 해도, 모델은 이전 그림과 내 말을 조건으로 삼아 그림을 매번 처음부터 새로 그린다. 게다가 그림의 각 부분이 서로 얽혀 있어서, 한 군데를 향한 지시가 엉뚱한 데까지 번진다. 대화가 길어져 맥락이 쌓일수록 캐릭터 생김새나 화풍이 조금씩 더 흔들렸다.

그래서 방법을 바꿨다. 고치고 싶은 걸 클로드한테 넘겨서 프롬프트로 다시 정리하게 시키고, 그걸 새 세션에서 처음부터 보냈다. 쌓인 대화 없이 깨끗한 상태에서 잘 정리된 프롬프트 하나로 생성하니, 이전 그림에 수정 요청을 얹을 때보다 훨씬 원하는 대로 나왔다.

## 결국 알게 된 건 하나였다

이 짓을 약 280번 반복했다. 그중 110번쯤은 "아니 이거 말고", "다시", "왜 이렇게 나와" 같은 수정 요청이었다. 그렇게 부딪히다 결국 하나를 알게 됐다.

> 제미나이한테는 영어로, 그리고 아주 명시적으로, 원하는 걸 일일이 다 적어줘야 제대로 만들어준다는 거다.

"귀여운 햄스터 표정 8개" 정도로 두루뭉술하게 던지면 매번 다른 게 나온다. 털색, 눈 모양, 코, 몸 비율, 렌더 스타일, 8개를 어떻게 배치할지까지 하나하나 박아야 한다.

그 긴 프롬프트를 내가 직접 영어로 쓰진 않았다.

> 이걸 클로드한테 "제미나이에 줄 프롬프트를 짜줘"라고 시켰다.

그렇게 받은 프롬프트를 제미나이에 넣고, 클로드가 잘 짰겠거니 믿으면서도 한편으론 이게 맞나 의심하면서 나온 결과물을 봤다. 그런데 여기서 진짜 중요한 건 따로 있다.

> 결과가 아쉬워도 나는 제미나이한테 직접 "이거 고쳐줘"라고 하지 않았다. 어디가 어떻게 아쉬운지는 내가 눈으로 보고 정했다. 대신 그 수정은 클로드한테 넘겨서 프롬프트를 새로 짜게 했고, 새로 받은 프롬프트를 다시 제미나이에 넣어 결과를 확인했다.

내가 보고, 클로드가 프롬프트를 고치고, 제미나이로 검증하는 이 반복이 캐릭터를 일관되게 만든 방법의 전부였다.

그렇게 클로드가 짜준 프롬프트는 거의 잔소리 수준인데, 그대로 옮기면 아래와 같다.

솔직히 고백하면, 나는 이 프롬프트에 영어로 뭐가 적혀 있는지 정확히 다 알지는 못한다. 클로드가 짜준 걸 그대로 제미나이에 붙여넣었을 뿐이다.

**캐릭터 한 마리 만드는 프롬프트 (햄스터 예시)**

```text
Create a single cute 3D vinyl-toy figure of a chibi baby hamster, collectible style, smooth soft matte clay finish (no rough texture). Adorable and slightly derpy ("하찮은").

PROPORTIONS (match exactly, head-dominant 2-head-tall chibi):
- The whole figure is only about TWO heads tall.
- Build the figure as TWO clearly SEPARATE rounded masses stacked vertically: a big round HEAD on top and a smaller rounded BODY below, with a visible gentle pinch / indentation (a short neck) between them, like the reference panda and cat. Do NOT blend head and body into one continuous blob.
- The HEAD is the dominant ball: about HALF the total height and clearly WIDER and bigger than the body. Top-heavy and cute.
- The BODY is a distinctly smaller rounded belly sitting under the head, noticeably narrower than the head. NOT taller than the head, no long torso.
- Tiny short arm stubs at the sides; very short leg stubs with small rounded feet at the very bottom.

OUTPUT QUALITY (avoid banding / pixel artifacts):
- Clean high-resolution PNG, no JPEG compression.
- No wide soft low-contrast gradients across large flat areas.
- Crisp clean color regions with subtle but defined shading; no posterization.

SILHOUETTE CHECK:
- From the outline alone you should clearly read a big head-ball and a separate smaller body-ball with a soft waist between them, exactly like the existing panda/cat figures.

FACE & EXPRESSION:
- Flat round chibi face. Innocent, slightly smug-content stare.
- MEDIUM round glossy solid-black eyes, one bright catchlight + tiny sparkle. NO white sclera.
- A tiny pink heart-shaped nose, small soft content smile.
- Two small rounded ears sitting on top of the head.

HEAD & BODY MARKINGS:
- Even soft pastel-orange fur over the head and back.
- Cheeks, muzzle and belly a lighter warm cream for soft depth.
- All orange/cream boundaries SOFT-EDGED but DEFINED, narrow transition only, no long fade, no hard grooves or dark seams.

BODY & POSE:
- Big round head-ball on top, smaller rounded body-ball below with a soft waist.
- Tiny stub arms at the sides, short stub legs with small rounded feet.
- NO tail. Standing upright facing forward, chubby and clumsy, top-heavy.

COLOR (raised contrast to prevent banding):
- Orange areas: clean warm pastel-orange, saturated enough to read on a dark bg.
- Cream areas: soft warm cream.
- Eyes: solid black with bright glossy catchlights.
- Orange-vs-cream contrast clear and crisp; no muddy gray midtones.

LIGHTING & FINISH:
- Soft front studio lighting with gentle, well-defined shading.
- Smooth matte vinyl finish, faint highlight on the cheeks/belly and faint specular sheen to add micro-detail.

COMPOSITION:
- SQUARE 1:1. One hamster only, centered, filling most of the frame.
- Plain solid dark slate background (slightly lifted from pure black), no gradient.
- No accessories or props, no text, no logo, no ground shadow.
```

![기준으로 삼은 햄스터 한 마리. 이 정도로 다 박아야 원하는 대로 나왔다](/images/token-guardians/hamster-single.png)

**표정 여덟 개 시트 만드는 프롬프트 (햄스터 예시)**

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

이렇게 털색, 눈, 코, 비율, 렌더 스타일, 배치까지 일일이 다 박고, 기존 캐릭터를 정확한 레퍼런스로 붙여주니, 표정 여덟 개가 한 장에 일관되게 나왔다.

![토큰 지키미 캐릭터들의 표정 8종](/images/token-guardians/hamster-expressions.png)

무슨 뜻인지 다 몰라도, 넣으면 원하는 게 나왔다. 나는 그림을 못 그리는 서버 개발자고, 결과만 잘 나오면 그걸로 만족이었다.

뒤에는 이 한 장을 8개로 자르고 정렬하는 작업까지 손으로 안 하고 스킬로 자동화했다. 같은 시트를 넣으면 늘 같은 결과가 나오게 만들었다.

## 끝까지 내 결에 안 맞는 애들도 있었다

주둥이가 튀어나오거나 몸 생김새가 다른 캐릭터는 잘 못 나온다기보다, 내 캐릭터들 특유의 둥글고 매끈한 느낌이랑 잘 안 맞았다. 아기 돼지는 주둥이가 튀어나와서, 공룡은 몸 생김새 자체가 달라서, 아무리 다듬어도 판다 옆에 두면 겉돌았다.

![주둥이가 튀어나온 아기 돼지, 공룡, 용, 일각고래, 고슴도치, 물범. 내 캐릭터들의 둥근 느낌과 안 맞아 접은 습작들](/images/token-guardians/misfit-characters.png)

## 그래서 가디언즈가 됐다

결국 AI로 캐릭터를 만든다는 건 내가 직접 그리는 게 아니었다. 이상한 데를 찾아내서 말로 스펙을 좁혀가는 반복에 가까웠다. 그렇게 판다 한 마리가 고양이, 강아지, 햄스터, 펭귄으로 늘었고, 앱 이름도 "토큰 가디언즈"가 됐다.

다음 편에서는 이 앱을 윈도우에서도 돌리려다 프레임워크를 통째로 갈아엎은 이야기를 쓸 생각이다.
