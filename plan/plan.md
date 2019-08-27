# 네트워크 만들기 (three.js + vuetify2)

```
원 그리기 / 선 그리기 / 이동하기 / 애니메이션 하기 등 함수를 하나씩 다 만들어 놓고
force-directed graph를 그린다.

<완료 진행사항>
1.three.js로 원들을 그린다. (ok)
2.edge(line)을 그린다. (ok)
3.간단 데이터를 만든다. (ok)
4.force-directed layout으로 네트워크를 만든다. (ok)


<현재 진행사항>

1.네트워크 데이터를 만든다.
-csv를 json으로 형식을 만든다.
-각 투표 사건마다 어느나라가 찬성/반대/기권 했는지 데이터를 만든다.
-각 나라마다 similarity를 계산한 데이터를 만든다.
node는 나라이고,
edge는 각 나라의 similarity 상위 2개이다. 이렇게 데이터를 만든다.

node:
{
  country: USA,
  countryName: United States of America,
  similarities: {
    1970: {
      KOR: 0.7,
      JP: 0.6,
      CHN: 0.3
    },
    1975: {

    },
    ...,
    total: {
      KOR: 4.9,
      JP: 3.7,
      CHN: 1.1
    }
  },
  neighbors: { // 상위 2개만 있는 것들
    1970: {
      KOR: 0.7,
      JP: 0.6
    },
    ...,
    total: {
      KOR: 3.1,
      JP: 2.8,
      CHN: 0.5
    }
    total: {
      KOR: {
        similarity: 3.6,
        yearMean: -1 ~ 1 사이. similarity의 시간성이 과거에 혹은 미래에 가중이 있는지 알려주는 수치

        yearMean이 음수면, rgb(255 * v, 0, 0)
        yearMean이 양수면, rgb(0, 0, 255 * v)
        연도에 대한 가중치를 준다.
        평균 : 1950년
        총 similarity는 3.6
        ((1900 - 1950) * 1.2 + (2000 - 1950) * 2.4)) / (50 * 3.6)  => 좀더 파란색.

        각 노드별로 total neighbors의 각 neighbor마다 yearMean값이 필요하다.
      }
    }
  }
}
유사성이 가장 높은 2개로 edge가 만들어 진다.
super-graph에서는 각 연도별 유사성 높은 2개를 가중치한 것들을 모아둔 것으로 한다.

**
-Node 타입을 정한다.
-화면에 해당 데이터로 그린다.
-neighbor가 연도마다 있기 때문에 오류가 발생한다.
-각 연도를 모두 합쳐야 할까? total값 말이다.
-total을 데이터에서 만들도록 한다.
-total은 각 연도마다의 값을 모두 더한 값으로 하자.
-total로 edge를 형성한다.
-weight를 준다.
weight에 따라 굵기가 조절된다.
각 edge가 어느 similarity에 포함되어 있는지 알고 싶다.
연도가 어느정도인지 알고 싶다.
edge마다 similarity가 있고,

yearWeight

-html 레이아웃을 잡는다.

-타임라인으로 나타낸다.(vuetify)
-일정 시간을 보여주는 타임라인
-언제부터 언제까지 보여주는 타임라인
전체 시각화 하나랑,
한타임, 한타임씩 만드는 시각화가 필요로 한다.


edge:
{
  source: USA,
  target: KOR,
  weight: 0.7
}

2.force-directed graph에 그린다.
3.super-graph에 따라 weight를 준다.
4.timeline을 만든다.




```

# 파일 실행방법(node)

```
<대용량 json 읽어 올때 js 실행하는 방법>
node --max-old-space-size=32768 --stack-size=1968 src/refiningData/refiningData2.ts

--max-old-space-size를 8192  하면 실행이 된다.
```

# 메모

```
-Geometry를 하나로 바꿔서 활용해야 한다.
-force-directed 알고리즘이 계속 뭔가 더하는게 있는지 체크해야 한다. (점점 느려지기 때문?)


문제점이 있다.
yearWeightHash가 서로 다르다. 다르면 안되는데,
다를 수 있다.

-forced 알고리즘을 확인한다.
-네트워크의 색상을 준다.
-네트워크의 weight를 준다.


```
