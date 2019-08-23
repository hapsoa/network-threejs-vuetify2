/**
 * js로 짜던 것
 */
const _ = require('lodash');
const fs = require('fs');
const UNdata = require('./data-directory/small-UNdata.json');

const jsonFileResultPath = 'src/refiningData/result-directory/refinedData.json';

console.log('refiningData.js start');

// 데이터를 정제한다.

// nodesHash의 기본 정보를 구성한다.
const nodesHash = makeBasicNodesHash(UNdata);
// console.log('nodesHash', nodesHash);

// 총 사건의 수
const numOfRcid = UNdata[UNdata.length - 1].rcid - UNdata[0].rcid + 1;

// 사건마다의 메타데이터를 담은 변수
const rcidsHash = makeRcidsHash(UNdata);
// console.log('rcidsHash', rcidsHash);

// 연도별로 사건 수를 담은 변수
const numOfRcidsPerYearHash = makeNumOfRcidsPerYearHash(rcidsHash);
// console.log('numOfRcidsPerYearHash', numOfRcidsPerYearHash);

// 사건별 나라들의 투표현황에 대한 변수를 만든다.
const votesHashPerRcid = makeVotesHashPerRcid(UNdata);
// console.log('votesHashPerRcid', votesHashPerRcid);

// similarity를 만든다.
// 각 사건마다 similarity가 있다.
const similarVotesHashPerRcid = makeSimilarVotesHashPerRcid(UNdata, numOfRcid);
// console.log('similarVotesHashPerRcid', similarVotesHashPerRcid);

// 연도 기준으로 합쳐야 한다.
const similaritiesHashPerYear = makeSimilaritiesHashPerYear({
  rcidsHash,
  similarVotesHashPerRcid,
  numOfRcidsPerYearHash
});
console.log('similaritiesHashPerYear', similaritiesHashPerYear);

//
//
// 아래는 함수들이다.
//
//

/**
 * 나라 이름 같은 기본 정보만 들어있는 nodesHash를 만든다.
 */
function makeBasicNodesHash(UNdata) {
  const nodesHash = {};
  const firstRcid = UNdata[0].rcid; // 가장 첫 사건의 rcid
  for (let i = 0; i < UNdata.length; i++) {
    const datum = UNdata[i];
    if (firstRcid === datum.rcid) {
      nodesHash[datum.Country] = {
        Country: datum.Country,
        Countryname: datum.Countryname
      };
    } else {
      break;
    }
  }

  return nodesHash;
}

/**
 * 나라와 나라의 similarity에 대한 객체 property를 만들어 주는 함수이다.
 * @param {*} UNdata
 */
function makeBasicCountryProperty(UNdata) {
  const countriesProperty = {};
  const firstRcid = UNdata[0].rcid; // 가장 첫 사건의 rcid
  for (let i = 0; i < UNdata.length; i++) {
    const datum = UNdata[i];
    if (firstRcid === datum.rcid) {
      countriesProperty[datum.Country] = {};
    } else {
      break;
    }
  }

  const countriesPropertyKeys = Object.keys(countriesProperty);
  _.forEach(countriesProperty, (value, country) => {
    _.forEach(countriesPropertyKeys, key => {
      if (country !== key) {
        value[key] = 0;
      }
    });
  });

  return countriesProperty;
}

/**
 * 사건별로 나라 투표현황을 만드는 함수이다.
 */
function makeVotesHashPerRcid(UNdata) {
  // {
  //   rcid1: {
  //     KOR: 1,
  //     CHN: 2,
  //   },
  //   ...
  // }
  const votesHashPerRcid = {};

  for (let i = 0; i < UNdata.length; i++) {
    const datum = UNdata[i];
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
 * @param {*} UNdata
 */
function checkSimilarVoteForRcid(votesHash, UNdata) {
  // {
  //   KOR: {
  //     CHN: 0.3,
  //     USA: 0.1
  //   }
  // }
  const similarityForRcid = makeBasicCountryProperty(UNdata);
  _.forEach(similarityForRcid, (otherCountriesHash, country) => {
    _.forEach(otherCountriesHash, (otherCountrySimilarity, otherCountry) => {
      if (votesHash[country] === votesHash[otherCountry]) {
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
 * @param {*} UNdata
 * @param {number} numOfRcid : 사건의 수
 */
function makeSimilarVotesHashPerRcid(UNdata) {
  // {
  //   rcid1: {
  //     KOR: {
  //       USA: 1,
  //       CHN: 0
  //     }
  //   }
  // }
  const similarVotesHashPerRcid = {};
  for (let i = 0; i < UNdata.length; i++) {
    const datum = UNdata[i];
    if (!_.has(similarVotesHashPerRcid, datum.rcid)) {
      similarVotesHashPerRcid[datum.rcid] = checkSimilarVoteForRcid(
        votesHashPerRcid[datum.rcid],
        UNdata
      );
    }
  }
  return similarVotesHashPerRcid;

  // _.forEach(similaritiesHashPerRcid, (rcidObject, rcid) => {
  //   _.forEach(rcidObject, (otherCountryObject, country) => {
  //     _.forEach(otherCountryObject, (otherCountrySimilarity, otherCountry) => {
  //       otherCountryObject[otherCountry] /= numOfRcid;
  //     });
  //   });
  // });
}

/**
 * 사건별 메타데이터를 담는 객체를 만드는 함수이다.
 */
function makeRcidsHash(UNdata) {
  // {
  //   rcid1: {
  //     date: 1970-01-01,
  //     ...
  //   }
  // }
  const rcidsHash = {};
  for (let i = 0; i < UNdata.length; i++) {
    const datum = UNdata[i];
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
function makeSimilaritiesHashPerYear(o) {
  // similarVotesHashPerRcid
  // {
  //   rcid1: {
  //     KOR: {
  //       USA: 1,
  //       CHN: 0
  //     }
  //   }
  // }

  const similaritiesHashPerYear = {};
  // {
  //   1970: {
  //     KOR: {
  //       USA: 0.6
  //     }
  //   }
  // }

  _.forEach(o.similarVotesHashPerRcid, (similarVotesForRcid, rcid) => {
    // 해당 사건의 연도
    const rcidYear = o.rcidsHash[rcid].year;
    if (!_.has(similaritiesHashPerYear, rcidYear)) {
      similaritiesHashPerYear[rcidYear] = {};
    }

    // TODO 연도별로 투표 유사할때마다 더한다
    const smiliaritiesHashForYear = similaritiesHashPerYear[rcidYear];
    // KOR: {
    //   USA: 0.6
    // }

    _.forEach(similarVotesForRcid, (otherCountryObject, country) => {
      console.log(country, otherCountryObject);
      if (!_.has(smiliaritiesHashForYear, country)) {
        // smiliaritiesHashForYear[country] = ;
      }
      _.forEach(otherCountryObject, (otherCountrySimilarity, otherCountry) => {
        // smiliaritiesHashForYear[country] += otherCountrySimilarity;
      });
    });
  });
  console.log('similaritiesHashPerYear', similaritiesHashPerYear);

  // 연도별 사건의 수만큼 나눈다
  _.forEach(similaritiesHashPerYear, (similaritiesHash, year) => {
    _.forEach(similaritiesHash, (otherCountrySimilarity, otherCountry) => {
      // console.log('similaritiesHash', similaritiesHash);

      // TODO 연도별 사건수를 구해야 한다.
      // console.log('year', year);
      // console.log('o.numOfRcidsPerYearHash', o.numOfRcidsPerYearHash);
      similaritiesHash[otherCountry] /= o.numOfRcidsPerYearHash[year];
    });
  });

  return similaritiesHashPerYear;
}

/**
 * 연도별로 사건의 수를 담은 hash를 만드는 함수이다.
 * @param {*} rcidsHash : 사건별 메타데이터를 담은 변수
 */
function makeNumOfRcidsPerYearHash(rcidsHash) {
  // {
  //   1970: 5,
  // }
  const numOfRcidsPerYearHash = {};
  _.forEach(rcidsHash, (rcidObject, rcid) => {
    if (!_.has(numOfRcidsPerYearHash, rcidObject.year)) {
      numOfRcidsPerYearHash[rcidObject.year] = 0;
    }
    numOfRcidsPerYearHash[rcidObject.year] += 1;
  });

  return numOfRcidsPerYearHash;
}

//
//
//
// const refinedData = {};

// _.forEach(UNdata, datum => {
//   // rcid가 사건id이다.
//   // 각 사건마다 나라별 similarity가 계산이 가능하다.
//   // 묶는건 연도별 기준이기 때문에 연도별로 합칠 수 있어야 한다.
//   if (_.has(refinedData, datum.year)) {
//     refinedData[datum.year];
//     // 연도별로
//   }
// });

// const dataObject = _(UNdata)
//   .map(data => {
//     // 연도 단위로 사건을 나눈다.
//     return {
//       rcid: data.rcid,
//       Country: data.Country,
//       Countryname: data.Countryname,
//       date: data.date
//     };
//   })
//   .keyBy(data => data.Country)
//   .value();

// // 파일을 쓴다.
// fs.writeFile(jsonFileResultPath, JSON.stringify(dataObject), err => {
//   if (err) {
//     console.error(err);
//     return;
//   }
//   console.log('File has been created');
// });
