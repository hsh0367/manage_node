var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')
var Queue = require('bull');

var lur_que = new Queue('lur_que');
var check_que = new Queue('check_que');

// var nextSchemaIndex = Realm.schemaVersion(Realm.defaultPath);
// while (nextSchemaIndex < schemas.length) {
//   var migratedRealm = new Realm(schemas[nextSchemaIndex++]);
//   migratedRealm.close();
// }
let realm = new Realm({
  deleteRealmIfMigrationNeeded: true,
  disableFormatUpgrade: true,
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
  schemaVersion: 35
});

// realm.addListener("change", (realm, changes, schema) => {
//   write_log("realm.change : " + changes)
//
//   if (realm.isInTransaction) {
//     write_log("realm.change isInTransaction")
//     realm.commitTransaction();
//   }
// });

//realm file size growth fix test

// realm.addListener('change', () => {
//   console.log("realm.change")
//   realm.close();
//   realm.commitTransaction();
//
// });
// realm.addListener('insertions', () => {
//   console.log("realm.insertions")
//   realm.close();
//   realm.commitTransaction();
//
// });
// realm.addListener('newModifications', () => {
//   console.log("realm.newModifications")
//   realm.close();
//   realm.commitTransaction();
//
// });
// realm.addListener('oldModifications', () => {
//   console.log("realm.oldModifications")
//   realm.close();
//   realm.commitTransaction();
//
// });
// realm.addListener('deletions', () => {
//   console.log("realm.deletions")
//   realm.close();
//   realm.commitTransaction();
// });

// if(realm.isInTransaction){
//   console.log("test1111")
//   realm.removeAllListeners();
//   realm.close();
// }

require('date-utils');
var fs = require('fs');
var options = {
  encoding: 'utf8',
  flag: 'a'
};

function write_log(data) {
  var dt = new Date();
  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
  var dd = dt.toFormat('YYYY-MM-DD');
  fs.writeFile('./log/child/lur_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

console.log("[LUR] ON");
write_log("[LUR] ON")

console.log("lur_que : ON")
write_log("lur_que : ON")
console.log("check_que : ON")
write_log("check_que : ON")
var ccc = lur_que.getJobCounts()
ccc.then(function(value) {
  console.log(value);
  write_log("lur_que size : ", value)
})
var ssss = check_que.getJobCounts()
ssss.then(function(value) {
  console.log(value);
  write_log("check_que size : ", value)
})
// lur_que.empty().then(function() {
//   console.log("lur_que : emptyyyyyyyyyyyyyyyyyyyy")
//   write_log("lur_que : emptyyyyyyyyyyyyyyyyyyyy")
//
// })
// check_que.empty().then(function() {
//   console.log("check_que : emptyyyyyyyyyyyyyyyyyyyy")
//   write_log("check_que : emptyyyyyyyyyyyyyyyyyyyy")
// })
lur_que.process(function(job, done) {
  var imsi = job.data.imsi
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  // console.log("jobQueue : ", job.data.msg);
  //MP|LUR|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
  var now = Date.now();

  write_log("lur_que ON imsi : " + imsi)

  if (user_sim_checker.length > 0) {


    var imsi = user_sim_checker[0].imsi;
    var imei = user_sim_checker[0].imei;
    var tmsi = user_sim_checker[0].tmsi;
    var kc = user_sim_checker[0].kc;
    var cksn = user_sim_checker[0].cksn;
    var msisdn = user_sim_checker[0].msisdn;
    var lac = user_sim_checker[0].lac;
    var sim_id = user_sim_checker[0].sim_id;
    var sim_serial_no = user_sim_checker[0].sim_serial_no;
    var lur_date = user_sim_checker[0].lur_date
    var lur_fail_cnt = user_sim_checker[0].lur_fail_cnt
    var lur_check = user_sim_checker[0].lur_check

    var mcc = user_sim_checker[0].mcc;
    var mnc = user_sim_checker[0].mnc;
    var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
    let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
    var lur_check_time = global_carrier_checker[0].lur_check_time
    var LUR_time = global_carrier_checker[0].LUR_time
    var ip = global_carrier_checker[0].mp_ip
    var port = global_carrier_checker[0].mp_port

    write_log("lur_que lur_check_time : " + lur_check_time + " imsi  : " + imsi + "")

    write_log("ip  : " + ip + " port  : " + port + "")
    if (true) {
      // if (lur_date + LUR_time < now) {
      lur_fail_cnt = lur_fail_cnt + 1
      lur_check = 0

      realm.write(() => {
        user_sim_checker[0].lur_fail_cnt = lur_fail_cnt
        user_sim_checker[0].lur_check = lur_check
      });

      // 테스트하기 위해 check_que에 실행시키지 않았음
      check_que.add({
        imsi: imsi
      }, {
        delay: lur_check_time
        // jobId: job.data.imsi
      });
      var msg = "MP|LUR|" + imsi + "|" + imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + msisdn + "|" + lac + "|" + sim_id + "|" + sim_serial_no + "|"
      console.log(msg);
      write_log(msg);

      process.send({
        data: msg,
        port: port,
        ip: ip,
      });
      console.log("lur_que :  done check_que add  imsi : " + job.data.imsi)

      write_log("lur_que :  done check_que add  imsi : " + job.data.imsi)

      // else {
      //   console.log("lur_que :  add pass is already lur : " + job.data.imsi);
      //   write_log("lur_que :  add pass is already lur : " + job.data.imsi)
      //
      // }
    }
  }
  done();
});

check_que.process(function(job, done) {
  var imsi = job.data.imsi;
  // console.log("check_que : " + imsi)
  write_log("check_que : " + imsi)
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var now = Date.now();
  // if (user_sim_checker[0].lur_date + 3660000 < now) { //lur이 시도 실패
  // console.log("lur_que id : " + job.id + " imsi  : " + imsi)
  write_log("lur_que id : " + job.id + " imsi  : " + imsi)

  if (user_sim_checker.length > 0) {
    if (user_sim_checker[0].sim_type == 0) {
      var lur_date = user_sim_checker[0].lur_date;
      var lur_check = user_sim_checker[0].lur_check;
      var lur_fail_cnt = user_sim_checker[0].lur_fail_cnt;


      var mcc = user_sim_checker[0].mcc;
      var mnc = user_sim_checker[0].mnc;
      var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
      let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
      var LUR_time = global_carrier_checker[0].LUR_time

      var total = lur_date + LUR_time
      write_log("check_que imsi : " + imsi + "lur_date + LUR_time : " + total)
      write_log("check_que imsi : " + imsi + "LUR_time : " + LUR_time)

      write_log("check_que imsi : " + imsi + " lur_check : " + lur_check)


      if (total < now && lur_check == 0) {
        //lur이 시도 실패
        console.log("now : " + now + "lur_date : " + lur_date + " lur_check : " + lur_check)
        console.log("check_que : lur fail")


        try {
          lur_check = 1
          realm.write(() => {
            user_sim_checker[0].lur_check = lur_check
          });
          lur_que.add({
              imsi: imsi
            }
            // ,{jobId :imsi }
          );

          write_log("check_que :  lur_que add  imsi : " + job.data.imsi)

        }
        catch (e) {
          console.log(e)
          write_log("check_que :  lur_que add error  imsi : " + job.data.imsi + " error : " + e)

        }
      }
      else { //lur_que에 시도또는
        console.log("check_que : lur sucess")
        write_log("check_que :  lur sucess imsi : " + job.data.imsi)
        lur_fail_cnt = 0
        realm.write(() => {
          user_sim_checker[0].lur_fail_cnt = lur_fail_cnt
        });
      }
    }
    else if (user_sim_checker[0].sim_type == 1) { //ttgo
      var lur_date = user_sim_checker[0].lur_date;
      var lur_check = user_sim_checker[0].lur_check;
      var lur_fail_cnt = user_sim_checker[0].lur_fail_cnt;


      var mcc = user_sim_checker[0].mcc;
      var mnc = user_sim_checker[0].mnc;
      var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
      let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
      var LUR_time = global_carrier_checker[0].LUR_time

      var total = lur_date + LUR_time
      write_log("ttgo check_que imsi : " + imsi + "lur_date + LUR_time : " + total)
      write_log("ttgo check_que imsi : " + imsi + "LUR_time : " + LUR_time)

      write_log("ttgo check_que imsi : " + imsi + " lur_check : " + lur_check)


      if (total < now && lur_check == 0) {
        //lur이 시도 실패
        console.log("ttgo now : " + now + "lur_date : " + lur_date + " lur_check : " + lur_check)
        console.log("cttgoheck_que : lur fail")


        try {
          lur_check = 1
          realm.write(() => {
            user_sim_checker[0].lur_check = lur_check
          });
          lur_que.add({
              imsi: imsi
            }
            // ,{jobId :imsi }
          );

          write_log("check_que :  lur_que add  imsi : " + job.data.imsi)

        }
        catch (e) {
          console.log(e)
          write_log("check_que :  lur_que add error  imsi : " + job.data.imsi + " error : " + e)

        }
      }
      else { //lur_que에 시도또는
        console.log("check_que : lur sucess")
        write_log("check_que :  lur sucess imsi : " + job.data.imsi)
        lur_fail_cnt = 0
        realm.write(() => {
          user_sim_checker[0].lur_fail_cnt = lur_fail_cnt
        });
      }
    }

  }
  else {
    console.log("lur check_que : sim is not found")
    write_log("lur check_que : sim is not found")
  }
  done();
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'LUR': //테이블 체크
      //call function
      console.log("LUR ");
      lur_update2(data);
      break;
    case 'reTMSI': //회원가입
      //call function
      console.log("reTMSI");
      lur_update2(data);
      break;
    case 'QUE': //회원가입
      //call function
      console.log("check_que");
      QUE(data);
      break;
    case 'TRY': //회원가입
      //call function
      console.log("lur_try");
      lur_try(data);
      break;
    case 'LUR_SET': //회원가입
      //call function
      console.log("set_lur");
      set_lur(data);
      break;
    case 'SET_LURDATE': //회원가입
      //call function
      console.log("set_lur");
      reset_lurdate(data);
      break;
    case 'TT': //회원가입
      //call function
      console.log("TT");
      test(data);
      break;
    case 'TT2': //회원가입
      //call function
      console.log("TT2");
      test2(data);
      break;
    case 'TT3': //회원가입
      //call function
      console.log("TT3");
      test3(data);
      break;
    default:
      console.log("[LUR] not find sub command");
  }
}
process.on('message', (value) => {
  console.log("lur is on");
  // command_classifier(value.data);
  command_classifier(value.data)
});

function QUE(dictdata) {

  if (dictdata['data2'] == 'REMOVE') {
    lur_que.remove();
    check_que.remove();

  }
  else if (dictdata['data2'] == 'LOG') {
    var lur_que_job_log = lur_que.getJobs();
    var check_que_job_log = check_que.getJobs();

    console.log("lur_que_job_log : " + lur_que_job_log);
    console.log("check_que_job_log : " + check_que_job_log);

  }
}


function tt_lur_update(user_sim_checker, dictdata) {
  var now = Date.now();

  var command_line = dictdata['command']
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var tmsi = dictdata['data4']
  var lac = dictdata['data5']
  var arfcn = parseInt(dictdata['data6'])
  var kc = dictdata['data7']
  var cksn = parseInt(dictdata['data8'])
  var mcc = dictdata['data9']
  var mnc = dictdata['data10']
  var cell_id = dictdata['data11']
  var bsic = dictdata['data12']
  var lur_date = parseInt(dictdata['data13'])
  write_log("simchecker " + user_sim_checker.toString())
  write_log("dictdata " + dictdata.toString())
  write_log(tmsi + "|" + lac + "|" + arfcn + "|" + kc + "|" + cksn + "|" + mcc + "|" + mnc + "|" + cell_id + "|" + bsic + "|" + lur_date + "|")

  if (dictdata['data1'] == 'reTMSI') {
    // reTMSI|conID|imsi|tmsi|lac|arfcn|kc|cksn|mcc|mnc|cellid|bsic|lur_time|


    var lur_check = user_sim_checker[0].lur_check;
    var mcc = user_sim_checker[0].mcc;
    var mnc = user_sim_checker[0].mnc;
    var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
    let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
    var LUR_time = global_carrier_checker[0].LUR_time
    write_log(tmsi + "|" + lac + "|" + arfcn + "|" + kc + "|" + cksn + "|" + mcc + "|" + mnc + "|" + cell_id + "|" + bsic + "|" + lur_date + "|")


    if (true) { //lur이 시도 성공

      realm.write(() => {
        user_sim_checker[0].lur_check = 1,
          user_sim_checker[0].tmsi = tmsi,
          user_sim_checker[0].lac = lac,
          user_sim_checker[0].arfcn = arfcn,
          user_sim_checker[0].kc = kc,
          user_sim_checker[0].cksn = cksn,
          user_sim_checker[0].mcc = mcc,
          user_sim_checker[0].mnc = mnc,
          user_sim_checker[0].cell_id = cell_id,
          user_sim_checker[0].bsic = bsic,
          user_sim_checker[0].lur_date = lur_date
      });

      // lur_que.add({
      //   imsi: imsi
      // }, {
      //   // delay: global_value.lur_time
      //   delay: LUR_time
      //   // jobId: imsi
      // });

      write_log("tt_lur_update : lur_que add reTMSI " + LUR_time + " imsi : " + imsi)
    }

    else {
      console.log("tt_lur_update : lur pass")
      write_log("tt_lur_update :  LUR reTMSI pass lur_check : " + lur_check + " imsi : " + imsi)

    }
  }
  else if (dictdata['data1'] == 'LUR') {
    // LUR|conID|imsi|result|lur_time|  result  : 1 성공 / 0 -실패 / -1  채널로스 실패

    var command_line = dictdata['command']
    var conID = dictdata['data2']
    var imsi = dictdata['data3']
    var result = dictdata['data4']
    var lur_time = parseInt(dictdata['data5']) * 1000


    // const promise = new Promise(function(resolve, reject) {
    //   resolve(1);
    // });

    var mcc = user_sim_checker[0].mcc;
    var mnc = user_sim_checker[0].mnc;
    var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
    let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
    var LUR_time = global_carrier_checker[0].LUR_time
    var lur_check = user_sim_checker[0].lur_check

    if (true) { //lur이 시도 실패
      if (result == 1) {
        if (user_sim_checker[0].lur_date + LUR_time < now || lur_check == 0) {

          realm.write(() => {
            user_sim_checker[0].lur_date = lur_time - 7200000,
              user_sim_checker[0].lur_check = 1
          });
          // 테스트하기위해 잠시 제거
          // lur_que.add({
          //   imsi: imsi
          // }, {
          //   // delay: global_value.lur_time
          //   delay: LUR_time,
          //   //        jobId: imsi
          // });
          write_log("tt_lur_update :  lur_que add LUR result success imsi : " + imsi)
        }
        else {
          write_log("tt_lur_update :  lur_que add LUR result pass imsi : " + imsi)
        }
      }
      else if (result == 0) {
        console.log("tt_lur_update : lur_que add result 0  ")
        realm.write(() => {
          user_sim_checker[0].tmsi = "0"
        })
        write_log("tt_lur_update :  lur tmsi to zero " + user_sim_checker[0].imsi)
      }
      else {
        console.log("tt_lur_update : result fail " + result)
        write_log("tt_lur_update :  LUR result fail : " + result)
        // 테스트하기위해 잠시 제거
        // lur_que.add({
        //   imsi: imsi
        // }
        // ,{jobId :imsi }
        // );
      }

    }
    else {
      console.log("tt_lur_update : lur pass")
      write_log("tt_lur_update :  LUR lur pass lur_check : " + lur_check + " imsi : " + imsi)

    }
  }
}

function lur_update2(dictdata) {
  var now = Date.now();
  var imsi = dictdata['data3']
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);



  if (user_sim_checker.length > 0) {


    if (user_sim_checker[0].sim_type == 0) {

      if (dictdata['data1'] == 'reTMSI') {
        var command_line = dictdata['command']
        var conID = dictdata['data2']
        var tmsi = dictdata['data4']
        var lac = dictdata['data5']
        var arfcn = parseInt(dictdata['data6'])
        var kc = dictdata['data7']
        var cksn = parseInt(dictdata['data8'])
        var mcc = dictdata['data9']
        var mnc = dictdata['data10']
        var cell_id = dictdata['data11']
        var bsic = dictdata['data12']
        var lur_date = parseInt(dictdata['data13'])
        // reTMSI|conID|imsi|tmsi|lac|arfcn|kc|cksn|mcc|mnc|cellid|bsic|lur_time|


        var lur_check = user_sim_checker[0].lur_check;
        var mcc = user_sim_checker[0].mcc;
        var mnc = user_sim_checker[0].mnc;
        var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
        let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
        var LUR_time = global_carrier_checker[0].LUR_time

        if (true) { //lur이 시도 성공

          realm.write(() => {
            user_sim_checker[0].lur_check = 1,
              user_sim_checker[0].tmsi = tmsi,
              user_sim_checker[0].lac = lac,
              user_sim_checker[0].arfcn = arfcn,
              user_sim_checker[0].kc = kc,
              user_sim_checker[0].cksn = cksn,
              user_sim_checker[0].mcc = mcc,
              user_sim_checker[0].mnc = mnc,
              user_sim_checker[0].cell_id = cell_id,
              user_sim_checker[0].bsic = bsic,
              user_sim_checker[0].lur_date = lur_date
          });

          lur_que.add({
            imsi: imsi
          }, {
            // delay: global_value.lur_time
            delay: LUR_time
            // jobId: imsi
          });

          write_log("lur_update : lur_que add reTMSI " + LUR_time + " imsi : " + imsi)
        }

        else {
          console.log("lur_update : lur pass")
          write_log("lur_update :  LUR reTMSI pass lur_check : " + lur_check + " imsi : " + imsi)

        }
      }
      else if (dictdata['data1'] == 'LUR') {
        // LUR|conID|imsi|result|lur_time|  result  : 1 성공 / 0 -실패 / -1  채널로스 실패

        var command_line = dictdata['command']
        var conID = dictdata['data2']
        var imsi = dictdata['data3']
        var result = dictdata['data4']
        var lur_time = parseInt(dictdata['data5']) * 1000


        // const promise = new Promise(function(resolve, reject) {
        //   resolve(1);
        // });

        var mcc = user_sim_checker[0].mcc;
        var mnc = user_sim_checker[0].mnc;
        var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
        let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
        var LUR_time = global_carrier_checker[0].LUR_time
        var lur_check = user_sim_checker[0].lur_check

        if (true) { //lur이 시도 실패
          if (result == 1) {
            if (user_sim_checker[0].lur_date + LUR_time < now || lur_check == 0) {

              realm.write(() => {
                user_sim_checker[0].lur_date = lur_time,
                  user_sim_checker[0].lur_check = 1
              });
              // 테스트하기위해 잠시 제거
              lur_que.add({
                imsi: imsi
              }, {
                // delay: global_value.lur_time
                delay: LUR_time,
                //        jobId: imsi
              });
              write_log("lur_update :  lur_que add LUR result success imsi : " + imsi)
            }
            else {
              write_log("lur_update :  lur_que add LUR result pass imsi : " + imsi)
            }
          }
          else if (result == 0) {
            console.log("lur_update : lur_que add result 0  ")
            realm.write(() => {
              user_sim_checker[0].tmsi = "0"
            })
            write_log("lur_update :  lur tmsi to zero " + user_sim_checker[0].imsi)
          }
          else {
            console.log("lur_update : result fail " + result)
            write_log("lur_update :  LUR result fail : " + result)
            // 테스트하기위해 잠시 제거
            lur_que.add({
                imsi: imsi
              }
              // ,{jobId :imsi }
            );
          }

        }
        else {
          console.log("lur_update : lur pass")
          write_log("lur_update :  LUR lur pass lur_check : " + lur_check + " imsi : " + imsi)

        }
      }
    }
    else if (user_sim_checker[0].sim_type == 1) {
      tt_lur_update(user_sim_checker, dictdata)
    }


  }

  else {
    console.log("[LUR_UPDATE] is not found command")
    write_log("lur_update :  is not found command")

  }
}

function lur_update(dictdata) {
  var now = Date.now();

  if (dictdata['data1'] == 'reTMSI') {
    // reTMSI|conID|imsi|tmsi|lac|arfcn|kc|cksn|mcc|mnc|cellid|bsic|lur_time|

    var command_line = dictdata['command']
    var conID = dictdata['data2']
    var imsi = dictdata['data3']
    var tmsi = dictdata['data4']
    var lac = dictdata['data5']
    var arfcn = parseInt(dictdata['data6'])
    var kc = dictdata['data7']
    var cksn = parseInt(dictdata['data8'])
    var mcc = dictdata['data9']
    var mnc = dictdata['data10']
    var cell_id = dictdata['data11']
    var bsic = dictdata['data12']
    var lur_date = parseInt(dictdata['data13'])

    var user_sim_check = 'imsi = "' + imsi + '"';
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);



    if (user_sim_checker.length > 0) {

      var lur_check = user_sim_checker[0].lur_check;
      var mcc = user_sim_checker[0].mcc;
      var mnc = user_sim_checker[0].mnc;
      var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
      let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
      var LUR_time = global_carrier_checker[0].LUR_time

      if (lur_check != 1) { //lur이 시도 실패

        realm.write(() => {
          user_sim_checker[0].lur_check = 1,
            user_sim_checker[0].tmsi = tmsi,
            user_sim_checker[0].lac = lac,
            user_sim_checker[0].arfcn = arfcn,
            user_sim_checker[0].kc = kc,
            user_sim_checker[0].cksn = cksn,
            user_sim_checker[0].mcc = mcc,
            user_sim_checker[0].mnc = mnc,
            user_sim_checker[0].cell_id = cell_id,
            user_sim_checker[0].bsic = bsic,
            user_sim_checker[0].lur_date = lur_date
        });

        lur_que.add({
          imsi: imsi
        }, {
          // delay: global_value.lur_time
          delay: LUR_time
          // jobId: imsi
        });

        write_log("lur_update : lur_que add reTMSI " + LUR_time + " imsi : " + imsi)
      }

      else {
        console.log("lur_update : lur pass")
        write_log("lur_update :  LUR reTMSI pass lur_check : " + lur_check + " imsi : " + imsi)

      }
    }
    else {
      console.log("[LUR_UPDATE]reTMSI is not found sim")
      write_log("lur_update :  reTMSI  is not found sim ")

    }
  }
  else if (dictdata['data1'] == 'LUR') {
    // LUR|conID|imsi|result|lur_time|  result  : 1 성공 / 0 -실패 / -1  채널로스 실패

    var command_line = dictdata['command']
    var conID = dictdata['data2']
    var imsi = dictdata['data3']
    var result = dictdata['data4']
    var lur_time = parseInt(dictdata['data5']) * 1000

    var user_sim_check = 'imsi = "' + imsi + '"';
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

    // const promise = new Promise(function(resolve, reject) {
    //   resolve(1);
    // });
    if (user_sim_checker.length > 0) {
      var mcc = user_sim_checker[0].mcc;
      var mnc = user_sim_checker[0].mnc;
      var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
      let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
      var LUR_time = global_carrier_checker[0].LUR_time
      var lur_check = user_sim_checker[0].lur_check

      if (lur_check != 1) { //lur이 시도 실패
        if (result == 1) {
          realm.write(() => {
            user_sim_checker[0].lur_date = lur_time,
              user_sim_checker[0].lur_check = 1
          });


          console.log("lur_update : lur_que add result 1")
          if (user_sim_checker[0].lur_check == 0) {

          }

          lur_que.add({
            imsi: imsi
          }, {
            // delay: global_value.lur_time
            delay: LUR_time,
            //        jobId: imsi
          });

          write_log("lur_update :  lur_que add LUR result success imsi : " + imsi)
        }
        else if (result == 0) {

          console.log("lur_update : lur_que add result 0  ")
          realm.write(() => {
            user_sim_checker[0].tmsi = "0"
          })
          // if (user_sim_checker[0].lur_check == 0) {
          //
          //   lur_que.add({
          //     imsi: imsi
          //   }, {
          //     // delay: global_value.lur_time
          //     delay: 60000,
          //     //        jobId: imsi
          //   });
          //   realm.write(() => {
          //     user_sim_checker[0].lur_date = lur_time,
          //       user_sim_checker[0].lur_check = 1
          //
          //   });
          // }

          write_log("lur_update :  lur tmsi to zero " + user_sim_checker[0].tmsi)
        }
        else {

          console.log("lur_update : result fail " + result)
          write_log("lur_update :  LUR result fail : " + result)

        }

      }
      else {
        console.log("lur_update : lur pass")
        write_log("lur_update :  LUR lur pass lur_check : " + lur_check + " imsi : " + imsi)

      }
    }
    else {
      console.log("[LUR_UPDATE]LUR is not found sim")
      write_log("lur_update :  LUR is not found sim : " + imsi)

    }
  }

  else {
    console.log("[LUR_UPDATE] is not found command")
    write_log("lur_update :  is not found command")

  }


}



function lur_checker() {
  var now = Date.now();
  // var user_sim_check = 'user_id.@size >5';lur_update
  // let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  //
  let user_sim_checker = realm.objects('SIM');
  var array = [];
  var sim_length = user_sim_checker.length;

  if (user_sim_checker.length > 0) {
    for (var i = 0; i < sim_length; i++) {
      // if (user_sim_checker[i].lur_date == 0 || user_sim_checker[i].lur_date + 3660000 < now) {
      // if (user_sim_checker[i].lur_date == 0) {
      if (true) {
        array.push(user_sim_checker[i].imsi)
      }
      else {
        console.log("not lur sim")
      }
    }
  }
  else {
    console.log("[LUR] not found sim")
  }
  return array;
}

function set_lur() {
  var now = Date.now();
  var check = [];
  check = lur_checker();
  console.log("set_lur check.length : " + check.length)
  if (check.length > 0) {

    for (var i = 0; i < check.length; i++) {

      var user_sim_check = 'imsi = "' + check[i] + '"';
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
      try {

        realm.write(() => {
          user_sim_checker[0].lur_check = 1
        });
      }
      catch (e) {
        console.log(e)
      }
      console.log("set_lur " + check[i])

      lur_que.add({
        imsi: check[i]
      }, {
        // delay: global_value.lur_time,
        // jobId: check[i],
      });
      write_log("set_lur() add " + check[i])

    }
  }
  else {
    console.log("[LUR] not found sim")
  }
}

function lur_try(dictdata) {
  var imsi = dictdata['data2'];

  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  console.log("lur_try")
  write_log("lur_try")

  if (user_sim_checker.length > 0) {
    lur_que.add({
        imsi: imsi
      },
      //  {
      //   jobId: imsi
      // }
    );
    write_log("lur_try lur_que add")
  }
  else {
    console.log("[LUR_TRY] is not found sim")
  }
}

function sim_lur_try(dictdata) {
  var imsi = dictdata['data2'];
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  console.log("sim_lur_try")
  write_log("sim_lur_try")

  if (user_sim_checker.length > 0) {
    lur_que.add({
        imsi: imsi
      },
      //  {
      //   jobId: imsi
      // }
    );
    write_log("sim_lur_try lur_que add")
  }
  else {
    console.log("[SIM_LUR_TRY] is not found sim")
  }
}

function reset_lurdate(dictdata) {
  var imsi = dictdata['data2'];
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  console.log("reset_lurdate")
  write_log("reset_lurdate")

  if (user_sim_checker.length > 0) {

    realm.write(() => {
      user_sim_checker[0].lur_date = 0
    });
    write_log("reset_lurdate : " + imsi)
  }
  else {
    console.log("[reset_lurdate] is not found sim")
  }
}

function test() {
  var ssss = check_que.getDelayed()
  ssss.then(function(check_jobs) {
    console.log(check_jobs);
    var length = check_jobs.length
    for (var i = 0; i < length; i++) {
      check_jobs[i].remove();
    }

  })
}

function test2() {
  var ssss = check_que.getJobCounts()
  ssss.then(function(value) {
    console.log(value);
    write_log("check_que size : ", value)
  })
}

function test3() {
  var ssss = lur_que.getDelayed()
  ssss.then(function(lur_ques) {
    console.log(lur_ques);
    var length = lur_ques.length
    for (var i = 0; i < length; i++) {
      lur_ques[i].remove();
    }

  })
}
test()
test3()
// set_lur()
