var Realm = require('realm');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

let realm = new Realm({
  path: '/home/ubuntu/manage_node/object_data_copy_file.realm',
  deleteRealmIfMigrationNeeded: true,
  disableFormatUpgrade: true,
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
});
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
  fs.writeFile('./log/child/policy_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}
process.on('message', (value) => {
  console.log("mp is on");
  command_classifier(value.data);
});

//mp command_classifier
function command_classifier(data) {
  switch (data['data1']) {
    case 'PAGING':
      console.log("mp_paging ");
      mp_paging(data);
      break;
    case 'PORT_ARRANGE':
      console.log("PORT_ARRANGE");
      port_arrange(data);
      break;
    case 'BALANCE':
      callnsole.log("BALANCE ");
      sim_balance_check(data);
      break;
    case 'MSISDN':
      callnsole.log("MSISDN ");
      sim_msisdn_check(data);
      break;
    case 'CHARGE':
      callnsole.log("CHARGE");
      sim_charge(data);
      break;
    default:
      console.log("[CALL] not find sub command");
  }
}

//페이징 처리하는 함수
function mp_paging(dictdata) {

  // MP|PAGING|SEQ|sim_imsi|tmsi|channel|mi_type|arfcn|cell_id|bsic|
  // MP|PAGING|SEQ|sim_imsi|imei|tmsi|kc|cksn|msisdn|simbank_id|sim_serial_no|lac|channel|mi_type|arfcn|cell_id|bsic|
  // mi_type : 수신시 지정방법 imsi,tmsi
  // channel : 수신시 channel 정보


  var command = dictdata['command'];
  var sub_command = dictdata['data1'];
  var seq = dictdata['data2'];
  var sim_imsi = dictdata['data3'];
  var tmsi = dictdata['data4'];
  var channel = dictdata['data5'];
  var mi_type = dictdata['data6'];
  var arfcn = dictdata['data7'];
  var cell_id = dictdata['data8'];
  var bsic = dictdata['data9'];



  var user_check = 'user_sim_imsi = "' + sim_imsi + '"';

  var now = Date.now();
  var user_sim_check = 'imsi = "' + sim_imsi + '"'



  let user_checker = realm.objects('USER').filtered(user_check);
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


  if (user_sim_checker.length > 0) {
    var imsi = user_sim_checker[0].imsi;
    var imei = user_sim_checker[0].imei;
    var tmsi = user_sim_checker[0].tmsi;
    var kc = user_sim_checker[0].kc;
    var cksn = user_sim_checker[0].cksn;
    var msisdn = user_sim_checker[0].msisdn;
    var sim_id = user_sim_checker[0].sim_id;
    var sim_serial_no = user_sim_checker[0].sim_serial_no;
    var lac = user_sim_checker[0].lac;
    var arfcn = user_sim_checker[0].arfcn;
    var cell_id = user_sim_checker[0].cell_id;
    var bsic = user_sim_checker[0].bsic;

    var carrier_id = sim_imsi.slice(0, 5)
    var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
    let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);

    if (global_carrier_checker.length > 0) {
      var mp_ip = global_carrier_checker[0].mp_ip
      var mp_port = global_carrier_checker[0].mp_port

      var msg = "MP|PAGING|" + seq + "|" + imsi + "|" + imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + msisdn + "|" + sim_id + "|" + sim_serial_no + "|" + lac + "|" + channel + "|" + mi_type + "|" + arfcn + "|" + cell_id + "|" + bsic + "|"
      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip
      });
    }


  }
  else {

    var carrier_id = sim_imsi.slice(0, 5)
    var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
    let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);

    if (global_carrier_checker.length > 0) {
      var mp_ip = global_carrier_checker[0].mp_ip
      var mp_port = global_carrier_checker[0].mp_port

      var msg = "MP|PAGING|" + seq + "|" + sim_imsi + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + channel + "|" + mi_type + "|" + 0 + "|" + 0 + "|" + 0 + "|"
      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip
      });
    }
  }


}

// 아직 당장 필요한 기능이 아니므로 port_arrange 뼈대만 만들어둠
function port_arrange(dictdata) {
  //IN - MP|PORT_ARRANGE|CON_ID|IMSI|OUTBOUND|CUR_TIME|CALLOUT|/CALLIN|SRART/ANSWER/DROP|
  //OUT - ""
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var con_id = command_line['data2'];
  var imsi = command_line['data3'];
  var outbound = command_line['data4'];
  var cur_time = command_line['data5'];
  var call_out_in_check = command_line['data6'];
  var call_state = command_line['data7'];
}

//심잔액체크된 결과값을 받아 realm,MYSQL에 저장을 한다.
function sim_balance_check(dictdata) {
  //mysql 업데이트 해주어야 한다.
  // MP|BALANCE|conID|IMSI|result|balance|    result  : 1 성공 / 0 -실패 / -1  채널로스 실패
  //성공시 realm에 업데이트 해주어야 한다.
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var result = dictdata['data4']
  var balance = parseInt(dictdata['data5']);
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  console.log(dictdata)

  var sim_blance = user_sim_checker[0].sim_blance;
  if (result == 1) {
    sim_blance = balance
    if (user_sim_checker.length > 0) {
      realm.write(() => {

        user_sim_checker[0].sim_balance = sim_blance;
        user_sim_checker[0].etc_blance_flag = 0;

      })
      //mysql 업데이트 해주어야 한다.
      var dbmsg = "DB|ETC|BALANCE|" + imsi + "|" + sim_blance + "|";
      addon_child.send_data(dbmsg);
    }
    else {
      //imsi is not found
      console.log("MP sim_balance_check : is not found sim imsi " + imsi)
      write_log("MP sim_balance_check : is not found sim imsi " + imsi);
    }
  }
  else {
    //mysql 실패결과를 업데이트 해주어야 한다.
    var dbmsg = "DB|ETC|ERR|" + imsi + "|7|";
    addon_child.send_data(dbmsg);

  }

}
//value 값이 문자인지 숫자인지 판단하는 함수
function filterInt(value) {
  // ^(\+)?([0-9]*)$
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return value;
  return NaN;
}

//심 msisdn(전화번호) 채크를하여 msisdn(전화번호) 저장한다.
function sim_msisdn_check(dictdata) {
  //mysql 업데이트 해주어야 한다.
  // MP|MSISDN|conID|IMSI|result|MSISDN|    result  : 1 성공 / 0 -실패 / -1  채널로스 실패
  //성공시 realm에 업데이트 해주어야 한다.
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var result = dictdata['data4']
  var msisdn = dictdata['data5']
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  // var  country_code_checker= country_code_check(msisdn);
  var country_check = 'mcc = "' + user_sim_checker[0].mcc + '"';
  let country_checker = realm.objects('GLOBALCARRIER').filtered(country_check);
  console.log("aaaaaa - " + msisdn)
  msisdn = filterInt(msisdn);
  console.log("ssssss - " + msisdn)
  var msisdn_length = msisdn.length;


  if (msisdn != "0" && msisdn != NaN) {

    if (country_checker.length > 0 && user_sim_checker.length > 0) {
      var code = country_checker[0].country_code;
      msisdn = "0" + msisdn.substring(code.length, msisdn_length)
    }
    else {
      console.log("sim_msisdn_check : is not msisdn")
    }
  }
  if (result == 1) {
    if (user_sim_checker.length > 0) {
      realm.write(() => {
        user_sim_checker[0].msisdn = msisdn;
        user_sim_checker[0].etc_msisdn_flag = 0;
      })
      //mysql 업데이트 해주어야 한다.
      var dbmsg = "DB|ETC|MSISDN|" + imsi + "|" + msisdn + "|";
      addon_child.send_data(dbmsg);
    }
    else {
      //imsi is not found
      console.log("MP sim_msisdn_check : is not found sim imsi " + imsi);
      write_log("MP sim_msisdn_check : is not found sim imsi " + imsi);
    }
  }
  else {
    //mysql 실패결과를 업데이트 해주어야 한다.
    var dbmsg = "DB|ETC|ERR|" + imsi + "|5|";
    addon_child.send_data(dbmsg);
  }
}


//심 충전후 결과를 받아 업데이트한다.
function sim_charge(dictdata) {
  //mysql 업데이트 해주어야 한다.
  // MP|CHARGE|conID|IMSI|result|충전금액|    result  : 1 성공 / 0 -실패 / -1  채널로스 실패
  //성공시 realm에 업데이트 해주어야 한다.
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var result = dictdata['data4']
  var charging_balance = parseInt(dictdata['data5'])
  if (result == 1) {
    if (user_sim_checker.length > 0) {


      realm.write(() => {

        user_sim_checker[0].sim_balance = user_sim_checker[0].sim_balance + charging_balance;
        user_sim_checker[0].etc_charge_flag = 0;

      })
      //mysql 업데이트 해주어야 한다.
      var dbmsg = "DB|ETC|CHARGE|" + imsi + "|" + charging_balance + "|";
      addon_child.send_data(dbmsg);

    }
    else {
      //imsi is not found
      console.log("MP sim_charge : is not found sim imsi " + imsi);
      write_log("MP sim_charge : is not found sim imsi " + imsi);
    }
  }
  else {
    //mysql 실패결과를 업데이트 해주어야 한다.
    var dbmsg = "DB|ETC|ERR|" + imsi + "|6|";
    addon_child.send_data(dbmsg);

  }
}
