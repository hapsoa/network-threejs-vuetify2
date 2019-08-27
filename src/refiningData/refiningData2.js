"use strict";
exports.__esModule = true;
var _ = require('lodash');
var fs = require('fs');
var unJsonData = require('./data-directory/UNdata.json');
var jsonFileResultPath = 'src/refiningData/result-directory/allRefinedData.json';
var yearWeightResultPath = 'src/refiningData/yearWeightHashDirectory/yearWeightHash.json';
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
function initiate(unData) {
    // nodesHash의 기본 정보를 구성한다.
    var nodesHash = makeBasicNodesHash(unData);
    // console.log('nodesHash', nodesHash);
    // 총 사건의 수
    var numOfRcid = unData[unData.length - 1].rcid - unData[0].rcid + 1;
    // 사건마다의 메타데이터를 담은 변수
    var rcidsHash = makeRcidsHash(unData);
    // console.log('rcidsHash', rcidsHash);
    // 연도별로 사건 수를 담은 변수
    var numOfRcidsPerYearHash = makeNumOfRcidsPerYearHash(rcidsHash);
    // console.log('numOfRcidsPerYearHash', numOfRcidsPerYearHash);
    // 사건별 나라들의 투표현황에 대한 변수를 만든다.
    var votesHashPerRcid = makeVotesHashPerRcid(unData);
    // console.log('votesHashPerRcid', votesHashPerRcid);
    // similarity를 만든다.
    // 각 사건마다 similarity가 있다.
    var similarVotesHashPerRcid = makeSimilarVotesHashPerRcid(unData, votesHashPerRcid);
    // console.log('similarVotesHashPerRcid', similarVotesHashPerRcid);
    // 연도 기준으로 유사성을 구한다.
    var similaritiesHashPerYear = makeSimilaritiesHashPerYear({
        rcidsHash: rcidsHash,
        similarVotesHashPerRcid: similarVotesHashPerRcid,
        numOfRcidsPerYearHash: numOfRcidsPerYearHash,
        unData: unData
    });
    // console.log('similaritiesHashPerYear', similaritiesHashPerYear);
    // 각 노드별로 neighbors를 구한다.
    var neighboredNodesHash = makeNeighborsAll({
        nodesHash: nodesHash,
        similaritiesHashPerYear: similaritiesHashPerYear
    });
    // console.log('neighboredNodesHash', neighboredNodesHash);
    // yearMean을 구한다.
    var yearWeightHash = makeYearWeightHash({
        unData: unData,
        nodesHash: neighboredNodesHash,
        numOfRcidsPerYearHash: numOfRcidsPerYearHash
    });
    // 파일을 쓴다.
    fs.writeFile(jsonFileResultPath, JSON.stringify(neighboredNodesHash), function (err) {
        if (err) {
            console.error(err);
            return;
        }
        console.log('File(jsonFileResultPath) has been created');
    });
    // yearWeightHash 데이터도 파일을 쓴다.
    fs.writeFile(yearWeightResultPath, JSON.stringify(yearWeightHash), function (err) {
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
function makeBasicNodesHash(unData) {
    var nodesHash = {};
    var firstRcid = unData[0].rcid; // 가장 첫 사건의 rcid
    for (var i = 0; i < unData.length; i++) {
        var datum = unData[i];
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
        }
        else {
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
function makeBasicCountryProperty(unData) {
    var countriesProperty = {};
    var firstRcid = unData[0].rcid; // 가장 첫 사건의 rcid
    for (var i = 0; i < unData.length; i++) {
        var datum = unData[i];
        if (firstRcid === datum.rcid) {
            countriesProperty[datum.Country] = {};
        }
        else {
            break;
        }
    }
    var countriesPropertyKeys = Object.keys(countriesProperty);
    _.forEach(countriesProperty, function (value, country) {
        _.forEach(countriesPropertyKeys, function (key) {
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
function makeVotesHashPerRcid(unData) {
    // {
    //   rcid1: {
    //     KOR: 1,
    //     CHN: 2,
    //   },
    //   ...
    // }
    var votesHashPerRcid = {};
    for (var i = 0; i < unData.length; i++) {
        var datum = unData[i];
        if (!_.has(votesHashPerRcid, datum.rcid)) {
            votesHashPerRcid[datum.rcid] = {};
        }
        var oneRcidVotesHash = votesHashPerRcid[datum.rcid];
        oneRcidVotesHash[datum.Country] = datum.vote;
    }
    return votesHashPerRcid;
}
/**
 * 사건별로 나라별 similarity를 계산하는 함수이다.
 * @param {*} votesHash : 한 rcid의 나라들의 votesHash
 * @param {*} unData
 */
function checkSimilarVoteForRcid(votesHash, unData) {
    var similarityForRcid = makeBasicCountryProperty(unData);
    _.forEach(similarityForRcid, function (otherCountriesHash, country) {
        _.forEach(otherCountriesHash, function (otherCountrySimilarity, otherCountry) {
            if (votesHash[country] === votesHash[otherCountry]) {
                otherCountriesHash[otherCountry] += 1;
            }
            else {
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
function makeSimilarVotesHashPerRcid(unData, votesHashPerRcid) {
    // {
    //   rcid1: {
    //     KOR: {
    //       USA: 1,
    //       CHN: 0
    //     }
    //   }
    // }
    var similarVotesHashPerRcid = {};
    for (var i = 0; i < unData.length; i++) {
        var datum = unData[i];
        if (!_.has(similarVotesHashPerRcid, datum.rcid)) {
            similarVotesHashPerRcid[datum.rcid] = checkSimilarVoteForRcid(votesHashPerRcid[datum.rcid], unData);
        }
    }
    return similarVotesHashPerRcid;
}
/**
 * 사건별 메타데이터를 담는 객체를 만드는 함수이다.
 */
function makeRcidsHash(unData) {
    var rcidsHash = {};
    for (var i = 0; i < unData.length; i++) {
        var datum = unData[i];
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
    var similaritiesHashPerYear = {};
    _.forEach(o.similarVotesHashPerRcid, function (similarVotesForRcid, rcid) {
        // 해당 사건의 연도
        var rcidYear = o.rcidsHash[rcid].year;
        if (!_.has(similaritiesHashPerYear, rcidYear)) {
            // similaritiesHashPerYear[rcidYear] = {};
            similaritiesHashPerYear[rcidYear] = makeBasicCountryProperty(o.unData);
        }
        // TODO 연도별로 투표 유사할때마다 더한다
        var smiliaritiesHashForYear = similaritiesHashPerYear[rcidYear];
        // KOR: {
        //   USA: 0.6
        // }
        // {
        //   KOR: {
        //     USA: 1
        //   }
        // }
        _.forEach(similarVotesForRcid, function (otherCountryObject, country) {
            // 사건별로 투표를 도는데
            _.forEach(otherCountryObject, function (otherCountrySimilarity, otherCountry) {
                smiliaritiesHashForYear[country][otherCountry] += otherCountrySimilarity;
            });
        });
    });
    // console.log('similaritiesHashPerYear', similaritiesHashPerYear);
    // 연도별 사건의 수만큼 나눈다
    _.forEach(similaritiesHashPerYear, function (similaritiesHash, year) {
        _.forEach(similaritiesHash, function (otherCountryObject, country) {
            _.forEach(otherCountryObject, function (otherCountrySimilarity, otherCountry) {
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
function makeNumOfRcidsPerYearHash(rcidsHash) {
    var numOfRcidsPerYearHash = {};
    _.forEach(rcidsHash, function (rcidObject, rcid) {
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
function makeNeighborsAll(o) {
    _.forEach(o.nodesHash, function (node, country) {
        // node마다 neighbors를 만든다.
        // neighbors에 연도별 property를 만든다.
        _.forEach(o.similaritiesHashPerYear, function (similaritiesHashForYear, year) {
            node.neighbors[year] = makeNeighBorsForYear(similaritiesHashForYear[node.id]);
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
function makeTotalNeighbor(neighbors) {
    var totalNeighbor = {};
    _.forEach(neighbors, function (otherCountryObject, year) {
        _.forEach(otherCountryObject, function (similarity, otherCountry) {
            if (!_.has(totalNeighbor, otherCountry)) {
                totalNeighbor[otherCountry] = 0;
            }
            totalNeighbor[otherCountry] += similarity;
        });
    });
    // console.log('totalNeighbor', totalNeighbor);
    return totalNeighbor;
}
/**
 *
 * @param similaritiesHash : 해당 연도에서 한 노드의 다른나라와의 similarity hash
 */
function makeNeighBorsForYear(similaritiesHash) {
    var neighbors = {};
    var similarityPassScore = 0.5;
    // 가장 높은 노드 2개로 할까?
    var limitCount = 2;
    var currentCount = 0;
    _.forEach(similaritiesHash, function (similarity, otherCountry) {
        if (similarity >= similarityPassScore) {
            neighbors[otherCountry] = similarity;
            currentCount++;
        }
        if (currentCount >= limitCount) {
            return false;
        }
    });
    // 높은 점수 두개로 둘까?
    // 혹은 일정 similarity 점수 이상으로 만든다.
    // _.forEach(similaritiesHash, (similarity, otherCountry) => {
    //   if (similarity >= similarityPassScore) {
    //     neighbors[otherCountry] = similarity;
    //   }
    // });
    return neighbors;
}
/**
 * -1 ~ 1 사이. similarity의 시간성이 과거에 혹은 미래에 가중이 있는지 알려주는 수치를
 * 만드는 함수이다.
 * @param unData \
 */
function makeYearWeightHash(o) {
    var yearMeanHash = makeBasicCountryProperty(o.unData);
    var unYears = Object.keys(o.numOfRcidsPerYearHash);
    // 오름차순
    unYears.sort();
    var minYear = Number(unYears[0]);
    var maxYear = Number(unYears[unYears.length - 1]);
    // 최근 연도 ~ 제일 과거 연도 사이의 가운데 연도
    var middleYear = minYear + (maxYear - minYear) / 2;
    var halfOfMinToMiddleYear = middleYear - minYear;
    // console.log('middleYear', middleYear);
    _.forEach(o.nodesHash, function (node, nodeId) {
        _.forEach(node.neighbors.total, function (nodeTotalSimilarity, otherCountry) {
            // 공식을 넣는다.
            var timeWeight = 0;
            _.forEach(node.neighbors, function (countryObject, year) {
                if (year !== 'total') {
                    if (_.has(countryObject, otherCountry)) {
                        timeWeight +=
                            (Number(year) - middleYear) * countryObject[otherCountry];
                    }
                }
            });
            timeWeight /= halfOfMinToMiddleYear * nodeTotalSimilarity;
            // console.log('timeWeight!', timeWeight);
            yearMeanHash[nodeId][otherCountry] = timeWeight;
        });
    });
    // console.log('yearMeanHash', yearMeanHash);
    return yearMeanHash;
}
