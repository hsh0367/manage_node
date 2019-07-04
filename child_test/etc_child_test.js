console.log("[ETC] ON")
var Realm = require('realm');
const crypto = require('crypto');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var mysql = require('mysql');
var Queue = require('bull');

var etc_que = new Queue('etc_que');
var addon = require('bindings')('addon');
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");
var connection = mysql.createConnection({
  host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
  user: 'everytt',
  password: 'dpqmflTT1#',
  database: 'smartTT'
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
connection.on('error', function(err) {
  if (error.code == 'PROTOCOL_CONNECTION_LOST') {
    var connection = mysql.createConnection({
      host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
      user: 'everytt',
      password: 'dpqmflTT1#',
      database: 'smartTT'
    });
  }
});


var simlist = [];
let realm = new Realm({
  deleteRealmIfMigrationNeeded: true,
  disableFormatUpgrade: true,
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
  schemaVersion: 35
});

require('date-utils');
var fs = require('fs');
var options = {
  encoding: 'utf8',
  flag: 'a'
};
// realm.addListener("change", (realm, changes, schema) => {
//   write_log("realm.change : " + changes)
//
//   if (realm.isInTransaction) {
//     write_log("realm.change isInTransaction")
//     realm.commitTransaction();
//   }
// });

function write_log(data) {
  var dt = new Date();

  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
  var dd = dt.toFormat('YYYY-MM-DD');
  fs.writeFile('./log/child/etc_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

process.on('message', (value) => {
  console.log("ETC is on");
  ETC_classifier(value.data);
});

etc_que.process(function(job, done) {
  console.log("etc_que : " + job.data.imsi)
  console.log("etc_que : " + job.data.flag)
  var flag = job.data.flag;
  var imsi = job.data.imsi;
  var flag_point = 99;
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var now = Date.now();
  // flag = o 일경우 시도했으나 처리가 되지 않았다  falg = 1 일 경우 시도가 되었다.
  console.log("ETC balacne, msisdn, charge etc_que id : " + job.id + " imsi  : " + job.data.imsi)
  if (user_sim_checker.length > 0) {

    var etc_blance_flag = user_sim_checker[0].etc_blance_flag
    var etc_msisdn_flag = user_sim_checker[0].etc_msisdn_flag
    var etc_charge_flag = user_sim_checker[0].etc_charge_flag

    if (flag == "etc_blance_flag") {

      if (etc_blance_flag > 3) {
        //MYSQL에 표시해 주어야된다.
        console.log("MYSQL에 표시해 주어야된다.");
        etc_blance_flag = 0
        realm.write(() => {
          user_sim_checker[0].etc_blance_flag = etc_blance_flag;
        });
      }
      else {

        if (etc_blance_flag != 0) { // etc_blance_flag 실패시

          try {
            etc_blance_flag = etc_blance_flag + 1
            realm.write(() => {
              user_sim_checker[0].etc_blance_flag = etc_blance_flag + 1
            });
            write_log("etc_que :  new try etc_msisdn  imsi : " + job.data.imsi)
            sim_balance_check(imsi);
          }
          catch (e) {
            console.log(e)
            write_log("etc_que etc_msisdn_flag error : " + job.data.imsi + " error : " + e)
          }
        }
        else {
          write_log("etc_que etc_msisdn_flag success : " + job.data.imsi)
        }
      }

    }
    else if (flag == "etc_msisdn_flag") {

      if (etc_msisdn_flag > 3) {
        //MYSQL에 표시해 주어야된다.
        console.log("MYSQL에 표시해 주어야된다.");
        etc_msisdn_flag = 0
        realm.write(() => {
          user_sim_checker[0].etc_msisdn_flag = etc_msisdn_flag;
        });
      }
      else {

        if (etc_msisdn_flag != 0) { // etc_blance_flag 실패시

          try {
            etc_msisdn_flag = etc_msisdn_flag + 1
            realm.write(() => {
              user_sim_checker[0].etc_msisdn_flag = etc_msisdn_flag
            });
            write_log("etc_que :  new try etc_msisdn  imsi : " + job.data.imsi)
            sim_msisdn_check(imsi);

          }
          catch (e) {
            console.log(e)
            write_log("etc_que etc_msisdn_flag error : " + job.data.imsi + " error : " + e)
          }
        }
        else {
          write_log("etc_que etc_msisdn_flag success : " + job.data.imsi)
        }
      }

    }
    else if (flag == "etc_charge_flag") {
      if (etc_charge_flag > 3) {
        //MYSQL에 표시해 주어야된다.
        console.log("MYSQL에 표시해 주어야된다.");
        etc_charge_flag = 0
        realm.write(() => {
          user_sim_checker[0].etc_charge_flag = etc_charge_flag;
        });
      }
      else {

        if (etc_charge_flag != 0) { // etc_blance_flag 실패시

          try {
            etc_charge_flag = etc_charge_flag + 1
            realm.write(() => {
              user_sim_checker[0].etc_charge_flag = etc_charge_flag
            });
            write_log("etc_que :  new try etc_charge  imsi : " + job.data.imsi)
            sim_charge(imsi);
          }
          catch (e) {
            console.log(e)
            write_log("etc_que etc_charge_flag error : " + job.data.imsi + " error : " + e)
          }

        }
        else {
          write_log("etc_que etc_charge_flag success : " + job.data.imsi)
        }
      }
    }
  }
  else {
    console.log("ETC etc_que error : is not found sim")
    write_log("ETC etc_que error : is not found sim")
  }
  done();
});

var connection = mysql.createConnection({
  host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
  user: 'everytt',
  password: 'dpqmflTT1#',
  database: 'smartTT'

});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

function ETC_classifier(data) {
  switch (data['data1']) {

    case 'E00':
      //call function
      console.log("유저보기");
      view()
      break;
    case 'E11': //realm mysql 데이터베이스 동기화
      //call function
      DB_synchronization(data);
      break;
    case 'QUERY': //realm mysql 데이터베이스 동기화
      //call function
      console.log("QUERY")
      query_processor(data);
      break;
    case 'VIEW': //realm mysql 데이터베이스 동기화
      //call function
      console.log("table_view");
      table_view(data);
      break;
    case 'DEATH': //realm mysql 데이터베이스 동기화point_death
      //call function
      console.log("death");
      death(data);
      break;
    case 'PDEATH': //realm mysql 데이터베이스 동기화point_death
      //call function
      console.log("PDEATH");
      point_death(data);
      break;
    case 'CREDIT': //realm mysql 데이터베이스 동기화
      //call function
      credit_update(data);
      break;
    case 'BALANCE': //realm mysql 데이터베이스 동기화
      //call function
      sim_balance_check(data);
      break;
    case 'MSISDN': //realm mysql 데이터베이스 동기화
      //call function
      sim_msisdn_check(data);
      break;
    case 'MYSQL': //realm mysql 데이터베이스 동기화
      //call function
      send_mysql(data);
      break;
    case 'Z': //realm mysql 데이터베이스 동기화
      //call function
      tmsi_zero();
      break;
    default:
      console.log(data);
  }
}

function DB_synchronization(dictdata) {
  var command_line = dictdata;
  var chosechema = command_line['data2'];
  if (chosechema == 'SIM') {
    var sql = "SELECT * FROM tb_sim_list WHERE PID = 2433 OR PID = 2434 OR PID = 2435;";
    //sql SELECT pid, id,  sim_serial_no, imsi, simbank_name FORM tb_sim_list 2433, 2434

    connection.query(sql, function(err, result, fields) {
      if (err) throw err;
      // simlist = result;
      console.log("simlist length : " + result.length);
      write_log("DB_synchronization sim")

      for (var i = 0; i < result.length; i++) {
        var sim_check = 'sim_pid =  \"' + result[i].pid + '\" AND imsi = \"' + result[i].imsi + '\"';
        let sim_checker = realm.objects('SIM').filtered(sim_check);
        var tt = result.length - i;
        console.log("sim_checker length : " + tt);
        if (sim_checker.isEmpty()) {
          realm.write(() => {
            var sim_expire_date = new Date(result[i].sim_expire_date).getTime()
            let sim = realm.create('SIM', {
              sim_pid: result[i].pid,
              sim_id: result[i].id,
              sim_serial_no: result[i].sim_serial_no,
              simbank_name: result[i].simbank_name,
              imsi: result[i].imsi,
              mobileType: result[i].mobileType,
              msisdn: result[i].sim_no,
              imei: result[i].imei,
              sim_expire_date: sim_expire_date,
              mcc: result[i].mcc,
              mnc: result[i].mnc,
            });
          });
        }
        else {
          console.log("이미 있는 sim 입니다.")
          write_log("DB_synchronization sim : 이미 있는 sim 입니다")
        }
      }
      console.log("DB_synchronization sim end");
      write_log("DB_synchronization sim end")
    });
  }
  else if (chosechema == 'USER') {

    var sql = "SELECT id, pid FROM tb_user_test;";
    //sql SELECT pid, id,  sim_serial_no, imsi, simbank_name FORM tb_sim_list
    write_log("DB_synchronization user")

    connection.query(sql, function(err, result, fields) {
      if (err) throw err;
      // simlist = result;
      console.log("user length : " + result.length);
      realm.objects('USER');

      for (var i = 0; i < result.length; i++) {
        var user_check = 'user_pid =  \"' + result[i].pid + '\"';
        let user_checker = realm.objects('USER').filtered(user_check);
        if (user_checker.length == 0) {
          realm.write(() => {
            let sim = realm.create('USER', {
              user_pid: result[i].pid,
              user_id: result[i].id,
            });
          });
        }
        else {
          console.log("이미 있는 user pid 입니다.")
          write_log("DB_synchronization USER : 이미 있는 user pid 입니다")

        }
      }
    });
    console.log("DB_synchronization end");
  }
  else if (chosechema == 'RATE') {
    var sql = "SELECT area_name, area_no, unit, value, pid FROM tb_rate;";
    write_log("DB_synchronization RATE")
    connection.query(sql, function(err, result, fields) {
      if (err) throw err;
      // simlist = result;
      console.log("rate length : " + result.length);
      realm.objects('RATE');
      let rate_length = realm.objects('RATE').length;
      for (var i = 0; i < result.length; i++) {
        var rate_check = 'id =  \"' + result[i].pid + '\"';
        let rate_checker = realm.objects('RATE').filtered(rate_check);
        console.log("rate " + i + "  : " + parseFloat(result[i].value.toFixed(3)))
        if (rate_checker.length == 0) {
          realm.write(() => {
            let rate = realm.create('RATE', {
              id: result[i].pid,
              area_no: result[i].area_no,
              area_name: result[i].area_name,
              call_value: parseFloat(result[i].value.toFixed(3)),
              call_unit: result[i].unit,
            });

          });
        }
        else {
          console.log("이미 있는 rate 입니다.")
          write_log("DB_synchronization RATE : 이미 있는 rate 입니다")

        }
      }
    });
    console.log("DB_synchronization end");
    write_log("DB_synchronization end RATE")

  }
  else if (chosechema == 'CARRIER') {
    console.log("CARRIER");

    try {


      var sql = "SELECT *  FROM tb_global_carrier;";
      write_log("DB_synchronization GLOBALCARRIER")
      connection.query(sql, function(err, result, fields) {
        if (err) throw err;
        // simlist = result;
        console.log("GLOBALCARRIER length : " + result.length);
        for (var i = 0; i < result.length; i++) {
          var global_carrier_check = 'carrier_id =  \"' + result[i].carrier_id + '\"';
          let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
          if (global_carrier_checker.length == 0) {
            realm.write(() => {
              let carrier = realm.create('GLOBALCARRIER', {

                carrier_id: result[i].carrier_id,
                country: result[i].country,
                country_code: result[i].country_code,
                carrier: result[i].carrier,
                mcc: result[i].mcc,
                mnc: result[i].mnc,
                smsc: result[i].smsc,
                callout_unit: result[i].callout_unit,
                callout_value: result[i].callout_value,
                callin_unit: result[i].callin_unit,
                callin_value: result[i].callin_value,
                smsout_price: result[i].smsout_price,
                smsin_price: result[i].smsin_price,
                chargin_amounnt: result[i].chargin_amounnt,
                balance_ussd: result[i].balance_ussd,
                msisdn_ussd: result[i].msisdn_ussd,
                simprice: result[i].sim_price,
                add_time: result[i].add_time,
                // LUR_time: parseInt(global_carrier[17],10),
                LUR_time: result[i].lur_time,
                lur_check_time: result[i].lur_check_time,
                etc_check_time: result[i].etc_check_time,
              });

            });
          }
          else {
            console.log("이미 있는 rate 입니다.")
            write_log("DB_synchronization RATE : 이미 있는 rate 입니다")

          }
        }
      });
      console.log("DB_synchronization end GLOBALCARRIER");
      write_log("DB_synchronization end GLOBALCARRIER")

    }
    catch (e) {
      console.log(e)
    }
  }
  else {
    console.log("global_carrier : is NaN")
  }
}


function send_mysql(dictdata) {
  var chosechema = dictdata['data2']
  if (chosechema == 'CARRIER') {
    console.log("CARRIER");
    var array = fs.readFileSync('./global_carrier.txt').toString().split("\n");
    for (var i = 0; i < array.length - 1; i++) {
      var temp = array[i]
      var global_carrier = temp.replace(/(\s*)/g, "").split(","); // 스플릿 오류로 인해 쪼개지지 않고 있어서 오류 발생한다.
      console.log("sss : " + array)

      console.log(global_carrier)

      try {
        var carrier_id = global_carrier[3] + global_carrier[4];
        var global_carrier_check = 'carrier_id = ' + parseInt(carrier_id) + '';
        let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);


        if (global_carrier_checker.length == 0) {
          var carrier_id = global_carrier[3] + global_carrier[4]
          var dbmsg = "DB|QUERY|INSERT INTO tb_global_carrier (carrier_id, country, country_code, carrier, mcc, mnc, smsc, callout_unit, callout_value, callin_unit, callin_value, smsout_price, smsin_price, charge_amount, balance_ussd, msisdn_ussd, sim_price, add_time, lur_time, lur_check_time, etc_check_time) VALUES ( " + carrier_id + ", \"" + global_carrier[0] + "\", \"" + global_carrier[1] + "\", \"" + global_carrier[2] + "\", \"" + global_carrier[3] + "\", \"" + global_carrier[4] + "\" , \"" + global_carrier[5] + "\", " + global_carrier[6] + "," + global_carrier[7] + ", " + global_carrier[8] + "," + global_carrier[9] + ", " + global_carrier[10] + ", " + global_carrier[11] + ", " + global_carrier[12] + ", \"" + global_carrier[13] + "\", \"" + global_carrier[14] + "\", " + global_carrier[15] + ", " + global_carrier[16] + "," + global_carrier[17] + "," + global_carrier[18] + "," + global_carrier[19] + ");|"
          // var dbmsg = "DB|QUERY|INSERT INTO tb_global_carrier VALUES (" + carrier_id + ",\"" + global_carrier[0] + "\",\"" + global_carrier[1] + "\",\"" + global_carrier[2] + "\",\"" + global_carrier[3] + "\",\"" + global_carrier[4] + "\",\"" + global_carrier[5] + "\"," + global_carrier[6] + "," + global_carrier[7] + "," + global_carrier[8] + "," + global_carrier[9] + "," + global_carrier[10] + "," + global_carrier[11] + "," + global_carrier[12] + ",\"" + global_carrier[13] + "\",\"" + global_carrier[14] + "\"," + global_carrier[15] + "," + global_carrier[16] + "," + global_carrier[17] + "," + global_carrier[18] + "," + global_carrier[19] + ");|"

          console.log("[ETC] DB_synchronization  GLOBALCARRIER : " + dbmsg);
          write_log("[ETC] DB_synchronization  GLOBALCARRIER : " + dbmsg);
          addon_child.send_data(dbmsg)

        }
        else {
          console.log("이미있는 global_carrier row 입니다. : " + i + "번")
        }
      }
      catch (e) {
        console.log(e)
      }
    }
  }
}






function credit_update(dictdata) {
  var command_line = dictdata;
  var command = command_line['command'];
  var num = command_line['data2'];
  var user_pid = parseInt(command_line['data3']);
  var user_check = 'user_pid = ' + user_pid + '';
  let user_checker = realm.objects('USER').filtered(user_check);

  try {
    realm.write(() => {
      user_checker[0].credit = parseInt(num);
    })
    var sql = "UPDATE tb_user_test set credit = " + num + " WHERE pid  = " + user_pid;
    var dbmsg = "QUERY|UPDATE tb_user_test set credit = " + num + " WHERE pid  = " + user_pid;

  }
  catch (e) {
    console.log("credit_update error")
  }
}
//
// function sim_expire_date_update(dictdata) {
//   var command_line = dictdata;
//   var command = command_line['command'];
//   var sim_check = 'imsi != ""  AND user_id = "0" AND user_pid = 0';
//   let sim_checker = realm.objects('SIM').filtered(sim_check);
//   var now = Date.now();
//   var seven = 86400000 * 5;
//   var temp = now + seven;
//   try {
//     realm.write(() => {
//       for (var i = 0; i < sim_checker.length; i++) {
//         sim_checker[i].sim_expire_date = temp;
//       }
//     })
//
//     // var sql = "UPDATE tb_sim_list_test set sim_expire_date = " + temp;
//     // query_Launcher(sql);
//     console.log("sim end")
//   }
//   catch (e) {
//     console.log("credit_update error")
//   }
// }
//

function sim_balance_check(dictdata) {
  var imsi = dictdata['data2'];
  var port = dictdata['port'];

  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  // MP|BALANCE|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
  // ussd 커맨드, smsc 맨뒤에 추가
  if (user_sim_checker.length > 0) { //imsi 정보가 일치할 경우

    var user_carrier_check = 'mcc = "' + user_sim_checker[0].mcc + '" AND mnc = "' + user_sim_checker[0].mnc + '"';
    let user_carrier_checker = realm.objects('GLOBALCARRIER').filtered(user_carrier_check);
    var etc_blance_flag = user_sim_checker[0].etc_blance_flag
    if (user_carrier_checker.length > 0) {
      var mp_ip = user_carrier_checker[0].mp_ip;
      var mp_port = user_carrier_checker[0].mp_port;

      var msg = "MP|BALANCE|" + user_sim_checker[0].imsi + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].lac + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|" + user_carrier_checker[0].balance_ussd + "|" + user_carrier_checker[0].smsc + "|$" + port;
      // var msg = "MP|BALANCE|" + user_sim_checker[0].imsi + "|";

      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip

      });
      write_log("[ETC] sim_balance_check : " + msg);
      etc_que.add({
        imsi: imsi,
        flag: user_sim_checker[0].etc_blance_flag,
      }, {
        delay: user_carrier_checker[0].etc_check_time,
      });
    }
    else {
      console.log("[ETC] sim_balance_check GLOBALCARRIER : is not sim imsi");
      write_log("[ETC] sim_balance_check GLOBALCARRIER : is not sim imsi");
    }
  }
  else {
    console.log("[ETC] sim_balance_check : is not sim imsi");
    write_log("[ETC] sim_balance_check : is not sim imsi");
  }
}

function sim_msisdn_check(dictdata) {
  //MP|MSISDN|imsi|imei|tmsi|kc|cksn|lac|simbank_id|sim_serial_no|
  // ussd 커맨드, smsc 맨뒤에 추가
  var imsi = dictdata['data2'];
  var port = dictdata['port'];


  var user_sim_check = 'imsi = "' + parseInt(imsi) + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  if (user_sim_checker.length > 0) { //imsi 정보가 일치할 경우
    var mcc = user_sim_checker[0].mcc
    var mnc = user_sim_checker[0].mnc
    var imei = user_sim_checker[0].imei
    var tmsi = user_sim_checker[0].tmsi
    var kc = user_sim_checker[0].kc
    var cksn = user_sim_checker[0].cksn
    var lac = user_sim_checker[0].lac
    var sim_id = user_sim_checker[0].sim_id
    var sim_serial_no = user_sim_checker[0].sim_serial_no
    var etc_msisdn_flag = user_sim_checker[0].etc_msisdn_flag

    var msisdn_ussd = user_carrier_checker[0].msisdn_ussd
    var smsc = user_carrier_checker[0].smsc

    var user_carrier_check = 'mcc = "' + mcc + '" AND mnc = "' + mnc + '"';
    let user_carrier_checker = realm.objects('GLOBALCARRIER').filtered(user_carrier_check);

    if (user_carrier_checker.length > 0) {
      var mp_ip = user_carrier_checker[0].mp_ip;
      var mp_port = user_carrier_checker[0].mp_port;

      var msg = "MP|MSISDN|" + imsi + "|" + imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + lac + "|" + sim_id + "|" + sim_serial_no + "|" + msisdn_ussd + "|" + smsc + "|";
      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip

      });
      write_log("[ETC] sim_msisdn_check : " + msg);
      etc_que.add({
        imsi: imsi,
        flag: etc_msisdn_flag,
      }, {
        delay: user_carrier_checker[0].etc_check_time,
      });
    }
    else {
      console.log("[ETC] sim_msisdn_check GLOBALCARRIER: is not sim imsi");
      write_log("[ETC] sim_msisdn_check : is not sim imsi");
    }
  }
  else {
    console.log("[ETC] sim_msisdn_check GLOBALCARRIER: is not sim imsi");
    write_log("[ETC] sim_msisdn_check : is not sim imsi");
  }
}
//
// function sim_charge(imsi) {
//   //MP|CHARGE|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
//   // ussd 커맨드, smsc 맨뒤에 추가
//   var imsi = dictdata['data2']
//
//   var user_sim_check = 'imsi = "' + imsi + '"';
//   let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
//   if (user_sim_checker.length > 0) { //imsi 정보가 일치할 경우
//     var user_carrier_check = 'mcc = "' + user_sim_checker[0].mcc + '" AND mnc = "' + user_sim_checker[0].mnc + '"';
//     let user_carrier_checker = realm.objects('GLOBALCARRIER').filtered(user_carrier_check);
//     if (user_carrier_checker.length > 0) {
//
//       var msg = "MP|CHARGE|" + user_sim_checker[0].imsi + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].lac + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|" +
//         process.send(msg);
//       write_log("[ETC] sim_charge : " + msg);
//       etc_que.add({
//         imsi: imsi,
//         flag: user_sim_checker[0].etc_charge_flag,
//       }, {
//         delay: global_value.etc_check_time,
//       });
//
//     }
//     else {
//       console.log("ETC sim_charge GLOBALCARRIER: is not found GLOBALCARRIER")
//       write_log("ETC sim_charge GLOBALCARRIER: is not found GLOBALCARRIER")
//     }
//
//   }
//   else {
//     console.log("[ETC] sim_charge : is not sim imsi");
//     write_log("[ETC] sim_charge : is not sim imsi");
//   }
// }

function table_view(dictdata) {
  // console.log("USER RESULT",realm.objects('USER'));
  var command_line = dictdata;
  var chosechema = command_line['data2'];
  var content = command_line['data3'];
  write_log("table_view")
  if (chosechema == 'USER') {
    console.log("USER RESULT");
    console.log(realm.objects('USER'));
    let user_checker = realm.objects('USER')


    var user_json = JSON.stringify(user_checker);
    fs.writeFile('realm_user.json', user_json, 'utf8', function(err) {
      if (err) throw err;
      console.log('complete');
    });
  }
  else if (chosechema == 'SIM') {
    // console.log("SIM RESULT");
    // console.log(realm.objects('SIM').length);
    // console.log(realm.objects('SIM'));
    // var simcheck = 'imsi != ""';
    var now = Date.now();
    // var sim_check = 'imsi != ""  AND user_id = "0" AND user_pid = 0 AND sim_expire_date >"' + now + '"AND msisdn != ""';
    // var match_sim_check = 'imsi.@size >=15 AND msisdn.@size >=8 AND sim_expire_date > "' + now + '"AND expire_match_date < "' + now+'"';
    // var match_sim_check = 'imsi.@size >=15 AND msisdn.@size >=8 AND sim_expire_date > ' + now  + '';
    // console.log(match_sim_check);
    let sim_checker = realm.objects('SIM')
    if (sim_checker.length > 0) {

      console.log(sim_checker.length)
      console.log(sim_checker)
      var sim_json = JSON.stringify(sim_checker);
      fs.writeFile('realm_sim.json', sim_json, 'utf8', function(err) {
        if (err) throw err;
        console.log('complete');
      });
    }
    else {
      console.log("사용가능 심이 없습니다.")
    }
  }
  else if (chosechema == 'RATE') {
    let rate_checker = realm.objects('RATE')
    if (rate_checker.length > 0) {
      console.log(rate_checker.length)
      console.log(rate_checker[i])

    }
    else {
      console.log("RATE가 없습니다.")
    }
  }
  else if (chosechema == 'CARRIER') {

    let carrier_checker = realm.objects('GLOBALCARRIER')
    console.log(carrier_checker)

    var carrier_json = JSON.stringify(carrier_checker);
    fs.writeFile('realm_carrier.json', carrier_json, 'utf8', function(err) {
      if (err) throw err;
      console.log('complete');
    });
    // if (carrier_checker.length > 0) {
    //   console.log(carrier_checker.length)
    //   for (var i = 0; carrier_checker.length > i; i++) {
    //     console.log(carrier_checker[i])
    //   }
    // }
    // else {
    //   console.log("GLOBALCARRIER가 없습니다.")
    // }
  }
  else if (chosechema == 'ALL') {
    console.log("USER RESULT");
    console.log(realm.objects('USER').length);
    console.log(realm.objects('USER'));
    console.log("SIM RESULT");
    console.log(realm.objects('SIM').length);
    console.log(realm.objects('SIM'));

  }
  else {
    console.log("table_view command not found");
  }
}

function point_death(dictdata) {
  var chosechema = dictdata['data2'];
  var id = dictdata['data3'];

  try {
    write_log("point death : " + dictdata)

    if (chosechema == 'SIM') {
      var user_sim_check = 'imsi =  "' + id + '"';
      var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

      realm.write(() => {
        realm.delete(user_sim_checker);
        console.log(id + " SIM 완료")
        write_log(id + " SIM 완료")

      })
    }
    else if (chosechema == 'USER') {
      var user_chcek = 'user_id =  "' + id + '"';
      var user_checker = realm.objects('USER').filtered(user_chcek);


      realm.write(() => {
        realm.delete(user_checker);
        console.log(id + " USER 완료")
        write_log(id + " USER 완료")
      })
    }
    else if (chosechema == 'RATE') {
      var rate_check = 'area_no =  "' + id + '"';
      var rate_checker = realm.objects('RATE').filtered(rate_check);



      realm.write(() => {
        realm.delete(rate_checker);
        console.log(id + " RATE 완료")
        write_log(id + " RATE 완료")

      })
    }
    else if (chosechema == 'CARRIER') {

      var carrier_check = 'carrier_id =  "' + id + '"';
      var carrier_checker = realm.objects('RATE').filtered(carrier_check);


      realm.write(() => {
        realm.delete(carrier_checker);
        console.log(id + " CARRIER 완료")
        write_log(id + " CARRIER 완료")

      })
    }
  }
  catch (err) {
    console.log(err)
    write_log("point death err: " + err)
  }
}

function death(dictdata) {
  var chosechema = dictdata['data2'];
  try {
    write_log("policy_child death : " + dictdata)

    if (chosechema == 'SIM') {

      realm.write(() => {
        var allsim = realm.objects('SIM');
        realm.delete(allsim);
        console.log("전체 SIM 삭제 완료")
        write_log("전체 SIM 삭제 완료")

      })
    }
    else if (chosechema == 'USER') {
      realm.write(() => {
        var alluser = realm.objects('USER');
        realm.delete(alluser);
        console.log("전체 USER 삭제 완료")
        write_log("전체 USER 삭제 완료")

      })
    }
    else if (chosechema == 'RATE') {
      realm.write(() => {
        var allrate = realm.objects('RATE');
        realm.delete(allrate);
        console.log("전체 RATE 삭제 완료")
        write_log("전체 RATE 삭제 완료")

      })
    }
    else if (chosechema == 'CARRIER') {
      realm.write(() => {
        var allcarrier = realm.objects('GLOBALCARRIER');
        realm.delete(allcarrier);
        console.log("전체 CARRIER 삭제 완료")
        write_log("전체 CARRIER 삭제 완료")

      })
    }
    else if (chosechema == 'ALL') {
      realm.write(() => {
        realm.deleteAll();
        var alluser = realm.objects('USER');
        var allsim = realm.objects('SIM');
        realm.delete(alluser);
        realm.delete(allsim);
        console.log("전체 컬럼 삭제 완료")
        write_log("전체 컬럼 삭제 완료")

      })
    }
  }
  catch (err) {
    console.log(err)
    write_log(" death err: " + err)
  }
}


function tmsi_zero() {
  var user_sim_check = 'imsi =  "' + 510108042298969 + '"';
  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  realm.write(() => {

    user_sim_checker[0].tmsi = "0"
  })
}
