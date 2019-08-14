console.log("[test2] ON")
var Realm = require('realm');
const chema = require('/home/ubuntu/manage_node/global.js')
var Queue = require('bull');
var RealmQue = new Queue('RealmQue');
var HashMap = require('hashmap');

var sim_map = new HashMap();
var user_map = new HashMap();
var carrier_map = new HashMap();
var rate_map = new HashMap();

exports.sim_map = sim_map
exports.user_map = user_map
exports.carrier_map = carrier_map
exports.rate_map = rate_map


var mysql = require('mysql');
var config = {
  connectTimeout: 10000,
  host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
  user: 'everytt',
  password: 'dpqmflTT1#',
  database: 'smartTT'
}


var connection = mysql.createConnection(config);
connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  write_log("MYSQL Connected!");
});

let realm = new Realm({
  shouldCompactOnLaunch: (totalSize, usedSize) => {
    return true
  },
  path: '/home/ubuntu/manage_node/log/realm_controller.realm',
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
  fs.writeFile('./log/child/etc_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

function parser(data) {
  console.log("parser")
  var str = data;
  var command_divied = str.split("END");
  var job_que = [];


  command_divied.forEach(function(dummy) {
    var parser_data = dummy.trim().split("|");
    var dict = {};
    for (var i = 0; i < parser_data.length; i++) {
      if (i == 0) { //command
        dict["command"] = parser_data[0];
      }
      else {
        dict["data" + i] = parser_data[i];
      }
    }
    console.log(dict)
    command_classifier(dict)
  });
};

testQue.process(function(job, done) {
  console.log("testQue process : ", job.data)
  var data = job.data.data
  parser(data)
  done()
})

function command_classifier(data) {
  console.log("command_classifier start")
  switch (data['data1']) {
    case 'VIEW':
      console.log("start VIEW fucntion ")
      write_log("start VIEW fucntion ")
      view(data);
      break;
    case 'VIEW_H':
      console.log("start VIEW_HASH fucntion ")
      write_log("start VIEW_HASH fucntion ")
      view_hash(data);
      break;
    case 'RESTORE':
      console.log("start restore fucntion ")
      write_log("start restore fucntion ")
      data_restore(data);
      break;
    case 'INSERT':
      console.log("start insert fucntion ")
      write_log("start insert fucntion ")
      realm_insert(data);
      break;
    case 'R11':
      console.log("start restore fucntion ")
      write_log("start restore fucntion ")
      DB_synchronization(data);
      break;
    case 'MODIFY':
      console.log("start modify fucntion ")
      write_log("start modify fucntion ")
      realm_modify(data);
      break;
    case 'PDEATH':
      console.log("start modify fucntion ")
      write_log("start modify fucntion ")
      realm_pdeath(data);
      break;
    case 'DEATH':
      console.log("start modify fucntion ")
      write_log("start modify fucntion ")
      realm_death(data);
      break;
    default:
      //not find command
      console.log("[realm_controller] not find sub command");
  }
}

var SIM = function(imsi, user_id, mcc, mnc, imei, sim_type) {
  this.imsi = imsi;
  this.sim_pid = 0; //tb_si2m_list  pid
  this.user_pid = 0; //심 사용자 의 tb_user pid
  this.user_id = user_id; //심 사용자의 아이디
  this.user_serial = '0'; //심 사용자의 시리얼
  this.lur_date = 0; //마지막으로 lur 한 시간
  this.mcc = mcc; //심의 mcc 국가 코드
  this.mnc = mnc; //심의 mnc 이통사 코드
  this.lac = '0'; //tmsi 갱신되었을 때 lac 심인증정보
  this.cell_id = '0'; //tmsi 갱신되었을 때 cell id
  this.bsic = '0'; //tmsi 갱신되었을 때 bsic
  this.arfcn = 0; //tmsi 갱신되었을 때 arfcn
  this.tmsi = '0';
  this.kc = '0'; //tmsi 갱신되었을 때 kc
  this.cksn = 0; //tmsi 갱신되었을 때 cksn
  this.msisdn = '0'; //심의 전화번호
  this.sim_id = '0'; //심뱅크 ID
  this.sim_serial_no = 0; //심뱅크 심 위치
  this.simbank_name = '0'; //심뱅크 이름
  this.connector = '0'; //마지막으로 사용한 c118
  this.imei = imei; //getData할때  생성한 imei 임의 단말기 고유값
  this.mobileType = 0; //이동통신사 구분 숫자로 구분 들어올때 스트링으로 들어와서 변환해서 사용해야한다.
  this.doing_promo = 0; //1이면 프로모  현재 등록중
  this.sim_balance = 0; //심의 잔액
  this.out_call_time = 0; //무료 수신 분수
  this.expire_match_date = 0; //사용자 심 사용 만료일
  this.lur_fail_cnt = 0; //lur연속 실패횟수
  this.send_sms_cnt = 0; //발신할때 모바일에 보내는 ,reference number
  this.sim_state = 0; //대기심  만들때 심 상태
  this.sim_expire_date = 0; // sim_expire_date = milli sec
  this.charging = 0; // 충전중인지 플래그
  this.sim_type = sim_type; //0 – 집단형, 1- 개인형
  this.lur_check = 0; //0 – lur 시도 ok, 1- lur 시도 no
  this.etc_blance_flag = 0; // flag = o 일경우 시도했으나 처리가 되지 않았다  falg = 1 일 경우 시도가 되었다.
  this.etc_msisdn_flag = 0; // flag = o 일경우 시도했으나 처리가 되지 않았다  falg = 1 일 경우 시도가 되었다.
  this.etc_charge_flag = 0; // flag = o 일경우 시도했으나 처리가 되지 않았다  falg = 1 일 경우 시도가 되었다.
  return this;
}

var USER = function(user_id, user_pid, user_pw, user_serial, join_type) {

  this.user_pid = user_pid; //tb_user pid
  this.user_id = user_id; //사용자 아이디
  this.user_pw = user_pw; // 사용자 비밀번호
  this.user_serial = user_serial; //사용자 시리얼 회원가입 mysql 겹치지 않게
  this.credit = 0; // 사용자 크래딧 TOPUP
  this.auto_flag = 0; // 심 구매 자동 연장 0 = 연장않하지 않음, 1 = 연장
  this.app_type = 0; // 0-android, 1-ios
  this.call = 0; // 전화 call_seq
  this.join_type = join_type; // 0-집단형, 1-개인형
  this.user_sim_imsi = '0'; //사용자가 쓰는 심 IMIS
  this.recv_call_event_time = 0; //수신콜 이벤트 expire 시간
  this.call_event_time = 0; //발신콜 이벤트 expire 시간
  this.call_value = 0; //발신콜 과금 금액
  this.call_unit = 0; //발신콜 과금 단위
  this.recv_call_value = 0; //수신콜 과금 금액
  this.recv_call_unit = 0; //수신콜 과금 단위
  this.fcm_push_key = '0';
  this.voip_push_key = '0';
  return this;
}

var CARRIER = function() {
  this.carrier_id = 0;
  this.country = '0';
  this.country_code = '0';
  this.carrier = '0';
  this.mcc = '0';
  this.mnc = '0';
  this.smsc = '0';
  this.callout_unit = 0;
  this.callout_value = 0.00;
  this.callin_unit = 0;
  this.callin_value = 0.00;
  this.smsout_price = 0;
  this.smsin_price = 0;
  this.chargin_amounnt = 0;
  this.balance_ussd = '0';
  this.msisdn_ussd = '0';
  this.simprice = 0;
  this.add_time = 0;
  this.LUR_time = 0;
  this.lur_check_time = 0;
  this.etc_check_time = 0;
  this.mp_ip = "18.136.196.175";
  this.mp_port = "7006";
  return this;
}

var RATE = function(id, call_value, call_unit) {
  id = 0;
  call_value = 0.0;
  call_unit = 0;
  area_name = '0';
  area_no = 0;
}

function make_user_object(user_id, user_pid, user_pw, user_serial, join_type) {

  var user = {
    user_pid: user_pid, //tb_user pid
    user_id: user_id, //사용자 아이디
    user_pw: user_pw, // 사용자 비밀번호
    user_serial: user_serial, //사용자 시리얼 회원가입 mysql 겹치지 않게
    credit: 0, // 사용자 크래딧 TOPUP
    auto_flag: 0, // 심 구매 자동 연장 0 : 연장않하지 않음, 1 : 연장
    app_type: 0, // 0-android, 1-ios
    call: 0, // 전화 call_seq
    join_type: join_type, // 0-집단형, 1-개인형
    user_sim_imsi: '0', //사용자가 쓰는 심 IMIS
    recv_call_event_time: 0, //수신콜 이벤트 expire 시간
    call_event_time: 0, //발신콜 이벤트 expire 시간
    call_value: 0, //발신콜 과금 금액
    call_unit: 0, //발신콜 과금 단위
    recv_call_value: 0, //수신콜 과금 금액
    recv_call_unit: 0, //수신콜 과금 단위
    fcm_push_key: '0',
    voip_push_key: '0',
  }
  return user;
}

function make_sim_object(imsi, user_id, mcc, mnc, imei, sim_type) {
  var sim = {
    imsi: imsi,
    sim_pid: 0, //tb_si2m_list  pid
    user_pid: 0, //심 사용자 의 tb_user pid
    user_id: user_id, //심 사용자의 아이디
    user_serial: '0', //심 사용자의 시리얼
    lur_date: 0, //마지막으로 lur 한 시간
    mcc: mcc, //심의 mcc 국가 코드
    mnc: mnc, //심의 mnc 이통사 코드
    lac: '0', //tmsi 갱신되었을 때 lac 심인증정보
    cell_id: '0', //tmsi 갱신되었을 때 cell id
    bsic: '0', //tmsi 갱신되었을 때 bsic
    arfcn: 0, //tmsi 갱신되었을 때 arfcn
    tmsi: '0',
    kc: '0', //tmsi 갱신되었을 때 kc
    cksn: 0, //tmsi 갱신되었을 때 cksn
    msisdn: '0', //심의 전화번호
    sim_id: '0', //심뱅크 ID
    sim_serial_no: 0, //심뱅크 심 위치
    simbank_name: '0', //심뱅크 이름
    connector: '0', //마지막으로 사용한 c118
    imei: imei, //getData할때  생성한 imei 임의 단말기 고유값
    mobileType: 0, //이동통신사 구분 숫자로 구분 들어올때 스트링으로 들어와서 변환해서 사용해야한다.
    doing_promo: 0, //1이면 프로모  현재 등록중
    sim_balance: 0, //심의 잔액
    out_call_time: 0, //무료 수신 분수
    expire_match_date: 0, //사용자 심 사용 만료일
    lur_fail_cnt: 0, //lur연속 실패횟수
    send_sms_cnt: 0, //발신할때 모바일에 보내는 ,reference number
    sim_state: 0, //대기심  만들때 심 상태
    sim_expire_date: 0, // sim_expire_date : milli sec
    charging: 0, // 충전중인지 플래그
    sim_type: sim_type, //0 – 집단형, 1- 개인형
    lur_check: 0, //0 – lur 시도 ok, 1- lur 시도 no
    etc_blance_flag: 0, // flag : o 일경우 시도했으나 처리가 되지 않았다  falg : 1 일 경우 시도가 되었다.
    etc_msisdn_flag: 0, // flag : o 일경우 시도했으나 처리가 되지 않았다  falg : 1 일 경우 시도가 되었다.
    etc_charge_flag: 0, // flag : o 일경우 시도했으나 처리가 되지 않았다  falg : 1 일 경우 시도가 되었다.
  }
  return sim
}
// var sim = new SIM( 'imsi','user_id','mcc','mnc','imei','simtype')

function data_restore() {

  let sim_realm = realm.objects('SIM')
  let user_realm = realm.objects('USER')
  let carrier_realm = realm.objects('GLOBALCARRIER')
  let rate_realm = realm.objects('RATE')



  for (var i = 0; i < sim_realm.length; i++) {
    console.log("sim_realm : " + i)
    var sim = {
      imsi: sim_realm[i].imsi,
      sim_pid: sim_realm[i].sim_pid,
      user_pid: sim_realm[i].user_pid,
      user_id: sim_realm[i].user_id,
      user_serial: sim_realm[i].user_serial,
      lur_date: sim_realm[i].lur_date,
      mcc: sim_realm[i].mcc,
      mnc: sim_realm[i].mnc,
      lac: sim_realm[i].lac,
      cell_id: sim_realm[i].cell_id,
      bsic: sim_realm[i].bsic,
      arfcn: sim_realm[i].arfcn,
      tmsi: sim_realm[i].tmsi,
      kc: sim_realm[i].kc,
      cksn: sim_realm[i].cksn,
      msisdn: sim_realm[i].msisdn,
      sim_id: sim_realm[i].sim_id,
      sim_serial_no: sim_realm[i].sim_serial_no,
      simbank_name: sim_realm[i].simbank_name,
      imei: sim_realm[i].imei,
      mobileType: sim_realm[i].mobileType,
      sim_balance: sim_realm[i].sim_balance,
      out_call_time: sim_realm[i].out_call_time,
      expire_match_date: sim_realm[i].expire_match_date,
      lur_fail_cnt: sim_realm[i].lur_fail_cnt,
      send_sms_cnt: sim_realm[i].send_sms_cnt,
      sim_expire_date: sim_realm[i].sim_expire_date,
      charging: sim_realm[i].charging,
      sim_type: sim_realm[i].sim_type,
      lur_check: sim_realm[i].lur_check,
      etc_blance_flag: sim_realm[i].etc_blance_flag,
      etc_msisdn_flag: sim_realm[i].etc_msisdn_flag,
      etc_charge_flag: sim_realm[i].etc_charge_flag,
    }
    sim_map.set(sim_realm[i].imsi, sim)

  }

  for (var i = 0; i < user_realm.length; i++) {
    console.log("user_realm : " + i)

    let user = {
      user_pid: user_realm[i].user_pid,
      user_id: user_realm[i].user_id,
      user_pw: user_realm[i].user_pw,
      user_serial: user_realm[i].user_serial,
      credit: user_realm[i].credit,
      auto_flag: user_realm[i].auto_flag,
      app_type: user_realm[i].app_type,
      call: user_realm[i].call,
      join_type: user_realm[i].join_type,
      user_sim_imsi: user_realm[i].user_sim_imsi,
      recv_call_event_time: user_realm[i].recv_call_event_time,
      call_event_time: user_realm[i].call_event_time,
      call_value: user_realm[i].call_value,
      call_unit: user_realm[i].call_unit,
      recv_call_value: user_realm[i].recv_call_value,
      recv_call_unit: user_realm[i].recv_call_unit,
      fcm_push_key: user_realm[i].fcm_push_key,
      voip_push_key: user_realm[i].voip_push_key,
    };
    user_map.set(user_realm[i].user_id, user)

  }

  for (var i = 0; i < rate_realm.length; i++) {
    console.log("rate_realm : " + i)

    let rate = {
      id: rate_realm[i].id,
      call_value: rate_realm[i].call_value,
      call_unit: rate_realm[i].call_unit,
      area_name: rate_realm[i].area_name,
      area_no: rate_realm[i].area_no,
    };
    rate_map.set(rate_realm[i].area_no, rate)

  }

  for (var i = 0; i < carrier_realm.length; i++) {
    console.log("carrier_realm : " + i)

    let carrier = {
      carrier_id: carrier_realm[i].carrier_id,
      country: carrier_realm[i].country,
      country_code: carrier_realm[i].country_code,
      carrier: carrier_realm[i].carrier,
      mcc: carrier_realm[i].mcc,
      mnc: carrier_realm[i].mnc,
      smsc: carrier_realm[i].smsc,
      callout_unit: carrier_realm[i].callout_unit,
      callout_value: carrier_realm[i].callout_value,
      callin_unit: carrier_realm[i].callin_unit,
      callin_value: carrier_realm[i].callin_value,
      smsout_price: carrier_realm[i].smsout_price,
      smsin_price: carrier_realm[i].smsin_price,
      chargin_amounnt: carrier_realm[i].chargin_amounnt,
      balance_ussd: carrier_realm[i].balance_ussd,
      msisdn_ussd: carrier_realm[i].msisdn_ussd,
      simprice: carrier_realm[i].simprice,
      add_time: carrier_realm[i].add_time,
      LUR_time: carrier_realm[i].LUR_time,
      lur_check_time: carrier_realm[i].lur_check_time,
      etc_check_time: carrier_realm[i].etc_check_time,
      mp_ip: carrier_realm[i].mp_ip,
      mp_port: carrier_realm[i].mp_port,
    };
    carrier_map.set(carrier_realm[i].carrier_id, carrier)

  }
}
var a = {
  b: 1,
  c: 2
}
var b = 'c'
console.log(a[b] + 'vs' + a.b)

function realm_insert(dictdata) {
  console.log("in realm_insert")
  var schema = dictdata['data2']
  if (schema == "USER") {

    var user_id = dictdata['data3']
    var user_pid = parseInt(dictdata['data4'])
    var user_pw = dictdata['data5']
    var user_serial = dictdata['data6']
    var join_type = parseInt(dictdata['data7'])

    //REALM 중복체크

    realm.write(() => {
      var user = realm.create('USER', {
        user_id: user_id,
        user_pid: user_pid,
        user_pw: user_pw,
        user_serial: user_serial,
        join_type: join_type
      });
    })

    var use_object = make_user_object(user_id, user_pid, user_pw, user_serial, join_type)
    user_map.set(user_id, use_object)

  }
  else if (schema == "SIM") {
    console.log("in realm_insert SIM")

    var user_id = dictdata['data3']
    var imsi = dictdata['data4']
    var imei = dictdata['data5']
    var mcc = dictdata['data6']
    var mnc = dictdata['data7']
    var sim_type = parseInt(dictdata['data8'])
    //REALM 중복체크
    realm.write(() => {
      var sim = realm.create('SIM', {
        user_id: imsi,
        imsi: imsi,
        imei: imei,
        mcc: mcc,
        mnc: mnc,
        sim_type: sim_type
      })
    })

    console.log("in realm_insert SIM 2")

    var sim_object = make_sim_object(imsi, user_id, mcc, mnc, imei, sim_type)
    sim_map.set(imsi, sim_object)
  }
}

function realm_pdeath(dictdata) {
  console.log("in realm_modify")

  var schema = dictdata['data2']
  var key = dictdata['data3']


  if (schema == 'SIM') {
    var schema_checker = realm.objects(schema).filtered("imsi = '" + key + "'")
    realm.delete(schema_checker)
    sim_map.delete(key);
  }
  else if (schema == 'USER') {
    var schema_checker = realm.objects(schema).filtered("user_id = '" + key + "'")
    realm.delete(schema_checker)
    user_map.delete(key);
  }
  else if (schema == 'CARRIER') {
    var schema_checker = realm.objects(schema).filtered("carrier_id = '" + key + "'")
    realm.delete(schema_checker)
    carrier_map.delete(key);
  }
}

function realm_death(dictdata) {
  console.log("in realm_modify")

  var schema = dictdata['data2']

  if (schema == 'SIM') {
    var schema_checker = realm.objects(schema)
    realm.delete(schema_checker)
    keys.forEach(function(key) {
      sim_map.delete(key)
    })
  }
  else if (schema == 'USER') {
    var schema_checker = realm.objects(schema)
    realm.delete(schema_checker)

    keys.forEach(function(key) {
      user_map.delete(key);
    })
  }
  else if (schema == 'CARRIER') {
    var schema_checker = realm.objects(schema)
    realm.delete(schema_checker)
    keys.forEach(function(key) {
      carrier_map.delete(key);
    })

  }
}

function realm_modify(dictdata) {
  console.log("in realm_modify")

  var schema = dictdata['data2']
  var key = dictdata['data3']
  var where = dictdata['data4']
  var column = dictdata['data5']
  var data_type = dictdata['data6']

  if (dictdata['data7'] == 'INT') {
    var data = parseInt(dictdata['data7'])
  }
  else if (dictdata['data7'] == "FLOAT") {
    var data = parseFloat(dictdata['data7'])
  }
  else {
    var data = dictdata['data7']
  }

  if (schema == 'SIM') {
    var map_object = sim_map.get(key);
  }
  else if (schema == 'USER') {
    var map_object = user_map.get(key);

  }
  else {
    var map_object = carrier_map.get(key);
  }

  if (where != "0") {
    try {

      var schema_checker = realm.objects(schema).filtered(where)
      realm.write(() => {
        schema_checker[0][column] = data
      })
      // map.hash(key)[column] = data

      map_object[column] = data
      // Object.defineProperty(map_object,column,{
      //   column : data,
      // })
    }
    catch (e) {
      console.log("error : " + e)
    }
  }
  else {

  }

}

function view() {
  let sim_checker = realm.objects('SIM')
  let user_checker = realm.objects('USER')
  let carrier_checker = realm.objects('GLOBALCARRIER')

  console.log(sim_checker)
  console.log(user_checker)
  console.log(carrier_checker)
}

function view_hash() {
  console.log("view_hash")
  var keys = sim_map.keys();
  keys.forEach(function(key) {
    console.log("sim")
    console.dir(sim_map.get(key))
  })
  var keys = user_map.keys();
  keys.forEach(function(key) {
    console.log("user")
    console.dir(user_map.get(key))
  })
  var keys = carrier_map.keys();
  keys.forEach(function(key) {
    console.log("carrier")
    console.dir(carrier_map.get(key))
  })
}

//MYSQL 데이터베이스 데이터를 받아 realm에 넣어주는 함수
function DB_synchronization(dictdata) {
  var command_line = dictdata;
  var chosechema = command_line['data2'];
  if (chosechema == 'SIM') {

    //현재 테스트를 위해 3개 심데이터만 받고 있음
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
                LUR_time: result[i].lur_time,
                lur_check_time: result[i].lur_check_time,
                etc_check_time: result[i].etc_check_time,
                mp_ip: result[i].mp_ip,
                mp_port: result[i].mp_port

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
