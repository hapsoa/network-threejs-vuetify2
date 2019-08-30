import { LoDashStatic } from 'lodash';

// import { LoDashStatic } from 'lodash';

// tslint:disable: no-var-requires
// tslint:disable: prefer-for-of

/**
 * interface 모음
 */
interface UnDatum {
  rcid: number;
  vote: number;
  Country: string;
  Countryname: string;
  year: number;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  forceX: number;
  forceY: number;
  neighbors: CountryCountHashPerKey;
}

interface NodesHash {
  [nodeName: string]: Node;
}

interface RcidsHash {
  [rcid: number]: RcidObject;
}
interface RcidObject {
  year: number;
}

interface NumOfRcidsPerYearHash {
  [year: number]: number;
}

interface CountryCountHash {
  [country: string]: number;
}
interface CountryByCountryCountHash {
  [country: string]: CountryCountHash;
}
interface CountryByCountryCountHashPerNumber {
  // rcid, year
  [number: number]: CountryByCountryCountHash;
}
interface CountryCountHashPerKey {
  // rcid, year(total)
  [key: string]: CountryCountHash;
}

const _: LoDashStatic = require('lodash');
const fs = require('fs');

const unJsonData: UnDatum[] = require('./data-directory/UNdata.json');
const jsonFileResultPath =
  'src/refiningData/result-directory/refinedUnData.json';
const yearWeightResultPath =
  'src/refiningData/yearWeightHashDirectory/unYearWeightHash.json';
// const unJsonData: UnDatum[] = require('./data-directory/2year-UNdata.json');
// const jsonFileResultPath =
//   'src/refiningData/result-directory/2year-refinedUnData.json';
// const yearWeightResultPath =
//   'src/refiningData/yearWeightHashDirectory/2year-unYearWeightHash.json';

console.log('refiningData.js start');
initiate(unJsonData);

//
//
// 아래는 함수들이다.
//
//

/**
 * 해당 ts파일 코드들을 시작하는 함수이다.
 */
function initiate(unData: UnDatum[]) {
  // nodesHash의 기본 정보를 구성한다.
  const nodesHash = makeBasicNodesHash(unData);
  // console.log('nodesHash', nodesHash);

  // 총 사건의 수
  const numOfRcid: number = unData[unData.length - 1].rcid - unData[0].rcid + 1;

  // 사건마다의 메타데이터를 담은 변수
  const rcidsHash = makeRcidsHash(unData);
  // console.log('rcidsHash', rcidsHash);

  // 연도별로 사건 수를 담은 변수
  const numOfRcidsPerYearHash = makeNumOfRcidsPerYearHash(rcidsHash);
  // console.log('numOfRcidsPerYearHash', numOfRcidsPerYearHash);

  // 사건별 나라들의 투표현황에 대한 변수를 만든다.
  const votesHashPerRcid = makeVotesHashPerRcid(unData);
  // console.log('votesHashPerRcid', votesHashPerRcid);

  // similarity를 만든다.
  // 각 사건마다 similarity가 있다.
  const similarVotesHashPerRcid = makeSimilarVotesHashPerRcid(
    unData,
    votesHashPerRcid
  );
  // console.log('similarVotesHashPerRcid', similarVotesHashPerRcid);

  // 연도 기준으로 유사성을 구한다.
  const similaritiesHashPerYear = makeSimilaritiesHashPerYear({
    rcidsHash,
    similarVotesHashPerRcid,
    numOfRcidsPerYearHash,
    unData
  });
  // console.log('similaritiesHashPerYear', similaritiesHashPerYear);

  // 각 노드별로 neighbors를 구한다.
  const neighboredNodesHash: NodesHash = makeNeighborsAll({
    nodesHash,
    similaritiesHashPerYear
  });
  // console.log('neighboredNodesHash', neighboredNodesHash);

  // yearMean을 구한다.
  const yearWeightHash: CountryByCountryCountHash = makeYearWeightHash({
    unData,
    nodesHash: neighboredNodesHash,
    numOfRcidsPerYearHash
  });

  // 파일을 쓴다.
  fs.writeFile(jsonFileResultPath, JSON.stringify(neighboredNodesHash), err => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('File(jsonFileResultPath) has been created');
  });
  // yearWeightHash 데이터도 파일을 쓴다.
  fs.writeFile(yearWeightResultPath, JSON.stringify(yearWeightHash), err => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('File(yearWeightResultPath) has been created');
  });
}

/**
 * 나라 이름 같은 기본 정보만 들어있는 nodesHash를 만든다.
 */
function makeBasicNodesHash(unData: UnDatum[]): NodesHash {
  const nodesHash: NodesHash = {};
  const firstRcid = unData[0].rcid; // 가장 첫 사건의 rcid
  for (let i = 0; i < unData.length; i++) {
    const datum = unData[i];
    if (firstRcid === datum.rcid) {
      nodesHash[datum.Country] = {
        id: datum.Country,
        label: datum.Countryname,
        x: 0,
        y: 0,
        forceX: 0,
        forceY: 0,
        neighbors: {}
      };
    } else {
      break;
    }
  }

  return nodesHash;
}

/**
 * 나라와 나라의 similarity에 대한 객체 property를 만들어 주는 함수이다.
 * 현재 key값의 나라와 다른 나라들에 대해 구성된다.
 * @param unData
 */
function makeBasicCountryProperty(
  unData: UnDatum[]
): CountryByCountryCountHash {
  const countriesProperty: CountryByCountryCountHash = {};
  const firstRcid = unData[0].rcid; // 가장 첫 사건의 rcid

  for (let i = 0; i < unData.length; i++) {
    const datum = unData[i];
    if (firstRcid === datum.rcid) {
      countriesProperty[datum.Country] = {};
    } else {
      break;
    }
  }

  const countriesPropertyKeys = Object.keys(countriesProperty);
  _.forEach(countriesProperty, (value: any, country) => {
    _.forEach(countriesPropertyKeys, key => {
      if (country !== key) {
        value[key] = 0;
      }
    });
  });
  // console.log('countriesProperty', countriesProperty);

  return countriesProperty;
}

/**
 * 사건별로 나라 투표현황을 만드는 함수이다.
 */
function makeVotesHashPerRcid(unData: UnDatum[]): CountryCountHashPerKey {
  // {
  //   rcid1: {
  //     KOR: 1,
  //     CHN: 2,
  //   },
  //   ...
  // }
  const votesHashPerRcid: CountryCountHashPerKey = {};

  for (let i = 0; i < unData.length; i++) {
    const datum = unData[i];
    if (!_.has(votesHashPerRcid, datum.rcid)) {
      votesHashPerRcid[datum.rcid] = {};
    }
    const oneRcidVotesHash = votesHashPerRcid[datum.rcid];
    oneRcidVotesHash[datum.Country] = datum.vote;
  }
  return votesHashPerRcid;
}

/**
 * 사건별로 나라별 similarity를 계산하는 함수이다.
 * @param {*} votesHash : 한 rcid의 나라들의 votesHash
 * @param {*} unData
 */
function checkSimilarVoteForRcid(
  votesHash: CountryCountHash,
  unData: UnDatum[]
): CountryByCountryCountHash {
  const similarityForRcid: CountryByCountryCountHash = makeBasicCountryProperty(
    unData
  );
  _.forEach(similarityForRcid, (otherCountriesHash, country) => {
    _.forEach(otherCountriesHash, (otherCountrySimilarity, otherCountry) => {
      if (
        votesHash[country] === votesHash[otherCountry] &&
        votesHash[country] !== 8 &&
        votesHash[country] !== 9
      ) {
        otherCountriesHash[otherCountry] += 1;
      } else {
        //
      }
    });
  });

  return similarityForRcid;
}

/**
 * 사건별로 나라별 투표 similar를 만드는 함수이다.
 * @param {*} unData
 * @param {number} numOfRcid : 사건의 수
 */
function makeSimilarVotesHashPerRcid(
  unData: UnDatum[],
  votesHashPerRcid: CountryCountHashPerKey
): CountryByCountryCountHashPerNumber {
  // {
  //   rcid1: {
  //     KOR: {
  //       USA: 1,
  //       CHN: 0
  //     }
  //   }
  // }
  const similarVotesHashPerRcid: CountryByCountryCountHashPerNumber = {};

  for (let i = 0; i < unData.length; i++) {
    const datum = unData[i];
    if (!_.has(similarVotesHashPerRcid, datum.rcid)) {
      similarVotesHashPerRcid[datum.rcid] = checkSimilarVoteForRcid(
        votesHashPerRcid[datum.rcid],
        unData
      );
    }
  }
  return similarVotesHashPerRcid;
}

/**
 * 사건별 메타데이터를 담는 객체를 만드는 함수이다.
 */
function makeRcidsHash(unData: UnDatum[]): RcidsHash {
  const rcidsHash: RcidsHash = {};
  for (let i = 0; i < unData.length; i++) {
    const datum = unData[i];
    if (!_.has(rcidsHash, datum.rcid)) {
      rcidsHash[datum.rcid] = {
        year: datum.year
      };
    }
  }

  return rcidsHash;
}

/**
 * 연도별로 나라별 similarity를 만드는 함수이다.
 * @param {*} o.rcidsHash : 사건별 메타데이터
 * @param {*} o.similarVotesHashPerRcid : 사건별 투표가 유사한지 확인하는 데이터
 * @param {*} o.numOfRcidsPerYearHash : 연도별로 사건 수를 담은 변수
 */
function makeSimilaritiesHashPerYear(o: {
  rcidsHash: RcidsHash;
  similarVotesHashPerRcid: CountryByCountryCountHashPerNumber;
  numOfRcidsPerYearHash: NumOfRcidsPerYearHash;
  unData: UnDatum[];
}): CountryByCountryCountHashPerNumber {
  const similaritiesHashPerYear: CountryByCountryCountHashPerNumber = {};

  _.forEach(o.similarVotesHashPerRcid, (similarVotesForRcid, rcid) => {
    // 해당 사건의 연도
    const rcidYear = o.rcidsHash[rcid].year;
    if (!_.has(similaritiesHashPerYear, rcidYear)) {
      similaritiesHashPerYear[rcidYear] = makeBasicCountryProperty(o.unData);
    }

    // TODO 연도별로 투표 유사할때마다 더한다
    const smiliaritiesHashForYear = similaritiesHashPerYear[rcidYear];
    // KOR: {
    //   USA: 0.6
    // }

    // {
    //   KOR: {
    //     USA: 1
    //   }
    // }
    _.forEach(similarVotesForRcid, (otherCountryObject, country) => {
      // 사건별로 투표를 도는데
      _.forEach(otherCountryObject, (otherCountrySimilarity, otherCountry) => {
        smiliaritiesHashForYear[country][
          otherCountry
        ] += otherCountrySimilarity;
      });
    });
  });

  // 연도별 사건의 수만큼 나눈다
  _.forEach(similaritiesHashPerYear, (similaritiesHash, year) => {
    _.forEach(similaritiesHash, (otherCountryObject, country) => {
      _.forEach(otherCountryObject, (otherCountrySimilarity, otherCountry) => {
        otherCountryObject[otherCountry] /= o.numOfRcidsPerYearHash[year];
      });
    });
  });

  return similaritiesHashPerYear;
}

/**
 * 연도별로 사건의 수를 담은 hash를 만드는 함수이다.
 * @param {*} rcidsHash : 사건별 메타데이터를 담은 변수
 */
function makeNumOfRcidsPerYearHash(
  rcidsHash: RcidsHash
): NumOfRcidsPerYearHash {
  const numOfRcidsPerYearHash: NumOfRcidsPerYearHash = {};
  _.forEach(rcidsHash, (rcidObject, rcid) => {
    if (!_.has(numOfRcidsPerYearHash, rcidObject.year)) {
      numOfRcidsPerYearHash[rcidObject.year] = 0;
    }
    numOfRcidsPerYearHash[rcidObject.year] += 1;
  });

  return numOfRcidsPerYearHash;
}

/**
 * edge를 만드는 함수이다.
 * @param o
 */
function makeNeighborsAll(o: {
  nodesHash: NodesHash;
  similaritiesHashPerYear: CountryByCountryCountHashPerNumber;
}) {
  _.forEach(o.nodesHash, (node, country) => {
    // node마다 neighbors를 만든다.
    // neighbors에 연도별 property를 만든다.
    _.forEach(o.similaritiesHashPerYear, (similaritiesHashForYear, year) => {
      node.neighbors[year] = makeNeighBorsForYear(
        similaritiesHashForYear[node.id]
      );
    });
    // neighbors에 total property를 만든다.
    node.neighbors.total = makeTotalNeighbor(node.neighbors);
  });

  return o.nodesHash;
}

/**
 * 연도별 neighbors를 가지고 total property를 만드는 함수이다.
 * @param neighbors : 연도별로 highest similarity를 가진 다른 두 나라의 similarity를 가진 객체
 */
function makeTotalNeighbor(
  neighbors: CountryCountHashPerKey
): CountryCountHash {
  const totalNeighbor: CountryCountHash = {};
  _.forEach(neighbors, (otherCountryObject, year) => {
    _.forEach(otherCountryObject, (similarity, otherCountry) => {
      if (!_.has(totalNeighbor, otherCountry)) {
        totalNeighbor[otherCountry] = 0;
      }
      totalNeighbor[otherCountry] += similarity;
    });
  });
  return totalNeighbor;
}

/**
 * 한 노드의 한 연도에 대한 neighbors를 만드는 함수이다.
 * @param similaritiesHash : 해당 연도에서 한 노드의 다른나라와의 similarity hash
 */
function makeNeighBorsForYear(
  similaritiesHash: CountryCountHash
): CountryCountHash {
  const neighbors: CountryCountHash = {};
  const similarityPassScore: number = 0.5;
  const limitCount: number = 2;

  // TODO 높은 점수 두개로 만드는 법
  const sortedSimilarities = _(similaritiesHash)
    .map((similarity, otherCountry) => {
      return {
        otherCountry,
        similarity
      };
    })
    .sortBy(o => -o.similarity)
    .value();

  let standardSimilarity: number = 0;
  let currentCount: number = 0;
  _.forEach(sortedSimilarities, o => {
    if (currentCount < limitCount) {
      standardSimilarity = o.similarity;
      neighbors[o.otherCountry] = o.similarity;
      currentCount++;
    }
    if (standardSimilarity > o.similarity) {
      return false;
    }
  });

  // 일정 similarity 점수 이상으로 만드는 방법
  // let currentCount: number = 0;
  // _.forEach(similaritiesHash, (similarity, otherCountry) => {
  //   if (similarity >= similarityPassScore) {
  //     neighbors[otherCountry] = similarity;
  //     currentCount++;
  //   }
  //   if (currentCount >= limitCount) {
  //     return false;
  //   }
  // });

  return neighbors;
}

/**
 * -1 ~ 1 사이. similarity의 시간성이 과거에 혹은 미래에 가중이 있는지 알려주는 수치를
 * 만드는 함수이다.
 * @param unData \
 */
function makeYearWeightHash(o: {
  unData: UnDatum[];
  nodesHash: NodesHash;
  numOfRcidsPerYearHash: NumOfRcidsPerYearHash;
}): CountryByCountryCountHash {
  const yearMeanHash: CountryByCountryCountHash = makeBasicCountryProperty(
    o.unData
  );

  const unYears: string[] = Object.keys(o.numOfRcidsPerYearHash);
  // 오름차순
  unYears.sort();

  const minYear: number = Number(unYears[0]);
  const maxYear: number = Number(unYears[unYears.length - 1]);

  // 최근 연도 ~ 제일 과거 연도 사이의 가운데 연도
  const middleYear: number = minYear + (maxYear - minYear) / 2;
  const halfOfMinToMiddleYear: number = middleYear - minYear;

  _.forEach(o.nodesHash, (node, nodeId) => {
    _.forEach(node.neighbors.total, (nodeTotalSimilarity, otherCountry) => {
      // 공식을 넣는다.
      let timeWeight: number = 0;
      _.forEach(node.neighbors, (countryObject, year) => {
        if (year !== 'total') {
          if (_.has(countryObject, otherCountry)) {
            timeWeight +=
              (Number(year) - middleYear) * countryObject[otherCountry];
          }
        }
      });

      const divider: number = halfOfMinToMiddleYear * nodeTotalSimilarity;

      if (divider !== 0) {
        timeWeight /= divider;
      } else {
        console.log('divider 0 with', node.id, otherCountry);
      }

      // if (typeof timeWeight !== 'number') {
      //   timeWeight
      // }
      yearMeanHash[nodeId][otherCountry] = timeWeight;
    });
  });

  return yearMeanHash;
}
