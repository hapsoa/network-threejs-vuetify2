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
  name: USA,
  fullName: United States of America,
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
  neighbors: {

  }
}

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

```
bufferGeometry를 사용하니까 되네.
```
