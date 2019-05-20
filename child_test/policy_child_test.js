console.log("[POLICY] ON")
var Realm = require('realm');
const crypto = require('crypto');
const chema = require('../global.js')
const global_value = require('../global_value.js')

var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");
let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 20
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
  console.log("policy is on");
  command_classifier(value.data);
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'VIEW': //테이블 체크
      //call function
      console.log("테이블 체크");
      table_view(data);
      break;
    case 'TS00': //회원가입
      //call function
      console.log("회원가입");
      register(data);
      break;
    case 'TS01': //로그인
      //call function
      console.log("로그인");
      login(data);
      break;
    case 'TS03': //push-key 갱신
      //call function
      console.log("fcm-key 갱신");
      fcm_key_renewal(data);
      break;
    case 'TS06': //voip-key 갱신
      //call function
      console.log("voip-key 갱신");
      voip_key_renewal(data);
      break;
    case 'CS1': //voip-key 갱신
      //call function
      console.log("사용자 정보");
      user_info(data);
      break;
    case 'CS2': //buy sim
      //call function
      console.log("심구매");
      buy_sim(data);
      break;
    case 'CS6': //voip-key 갱신
      //call function
      console.log("auto_flag_renewal 갱신");
      auto_flag_renewal(data);
      break;
    case 'CS7': //voip-key 갱신
      //call function
      console.log("top_up");
      top_up(data);
      break;
    case 'DEATH': //테이블 체크
      //call function
      console.log("테이블 삭제");
      death(data);
      break;
    default:
      console.log("not find sub command");
  }
}

function table_view(dictdata) {
  // console.log("USER RESULT",realm.objects('USER'));
  var command_line = dictdata;
  var chosechema = command_line['data2'];
  var content = command_line['data3'];
  write_log("table_view")
  if (chosechema == 'USER') {
    console.log("USER RESULT");
    console.log(realm.objects('USER').length);
    console.log(realm.objects('USER'));
  }
  else if (chosechema == 'SIM') {
    // console.log("SIM RESULT");
    // console.log(realm.objects('SIM').length);
    // console.log(realm.objects('SIM'));
    // var simcheck = 'imsi != ""';
    var now = Date.now();
    var sim_check = 'msisdn.@size >=8 ';
    // var sim_check = 'imsi != ""  AND user_id = "0" AND user_pid = 0 AND sim_expire_date >"' + now + '"AND msisdn != ""';
    // var match_sim_check = 'imsi.@size >=15 AND msisdn.@size >=8 AND sim_expire_date > "' + now + '"AND expire_match_date < "' + now+'"';
    // var match_sim_check = 'imsi.@size >=15 AND msisdn.@size >=8 AND sim_expire_date > ' + now  + '';
    // console.log(match_sim_check);
    let sim_checker = realm.objects('SIM').filtered(sim_check);
    if (sim_checker.length > 0) {

      console.log(sim_checker.length)
      console.log(sim_checker)
    }
    else {
      console.log("사용가능 심이 없습니다.")
    }
  }
  else if (chosechema == 'RATE') {
    var rate_check = 'area_no = ' + parseInt(content) + '';

    let rate_checker = realm.objects('RATE').filtered(rate_check)
    if (rate_checker.length > 0) {
      console.log(rate_checker.length)
      for (var i = 0; rate_checker.length > i; i++) {
        console.log(rate_checker[i])
      }
    }
    else {
      console.log("RATE가 없습니다.")
    }
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

function death(dictdata) {
  var chosechema = dictdata['data2'];
  try {
    write_log("policy_child death : " + dictdata)

    if (chosechema == 'SIM') {
      realm.write(() => {

        var allsim = realm.objects('SIM');
        realm.delete(allsim);
        console.log("전체 SIM 완료")
      })
    }
    else if (chosechema == 'USER') {
      realm.write(() => {
        var alluser = realm.objects('USER');
        realm.delete(alluser);
        console.log("전체 USER 완료")
      })
    }
    else if (chosechema == 'RATE') {
      realm.write(() => {
        var allrate = realm.objects('RATE');
        realm.delete(allrate);
        console.log("전체 RATE 완료")
      })
    }
    else if (chosechema == 'ALL') {
      realm.write(() => {
        realm.deleteAll();
        var alluser = realm.objects('USER');
        var allsim = realm.objects('SIM');
        realm.delete(alluser);
        realm.delete(allsim);
        console.log("전체 삭제 완료")
      })
    }
  }
  catch (err) {
    if (err) {
      console.log(err)
      write_log("policy_child death err: " + err)
    }
  }

  function psw_encryption(password) {
    return "*" + crypto.createHash('sha1').update(crypto.createHash('sha1').update(password).digest('binary')).digest('hex').toUpperCase();
  }

  function user_info(dicdata) {
    var command = dicdata['command'];
    var sub_command = dicdata['data1'];
    var seq = dicdata['data2'];
    var user_serial = dicdata['data3'];
    var user_id = dicdata['data4'];

    //Policy|CS1|Seq|msisdn|imsi|credit|expire_match_date|net:other:date|net:other:date|
    //net:other:date|net:other:date|net:other:date|free_receive|use_event|promo_code||
    write_log("user_info : " + dicdata)

    var user_sim_check = 'user_id =  "' + user_id + '" AND user_serial = "' + user_serial + '"';
    let user_checker = realm.objects('USER').filtered(user_sim_check);
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

    if (user_checker.length > 0) {

      if (user_sim_checker.length > 0) {
        var msg = command + "|" + sub_command + "|" + seq + "|" + user_sim_checker[0].msisdn + "|" + user_checker[0].user_sim_imsi + "|" + user_checker[0].credit + "|" + timeConverter(user_sim_checker[0].expire_match_date) + "|" +
          "0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|" + user_sim_checker[0].out_call_time + "|0|0|";
        process.send(msg);
        console.log(msg);
        write_log("user_info : " + msg)

      }
      else {
        var msg = command + "|" + sub_command + "|" + seq + "|0|0|" + user_checker[0].credit + "|0|0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|0|0|0|";
        process.send(msg);
        console.log(msg);
        write_log("user_info : " + msg)

      }
    }
    else {
      var msg = command + "|" + sub_command + "|" + seq + "|FAIL|";
      process.send(msg);
      console.log("등록되지 않는 사용자입니다.");
      write_log("user_info : " + msg)
    }
  }

  function register(dicdata) {
    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var tcp_fd = command_line['data3'];
    var user_id = command_line['data4'];
    var user_pw = command_line['data5'];
    var join_type = parseInt(command_line['data6']);
    var realm_id = 'user_id = "' + user_id + '"';
    let realm_id_checker = realm.objects('USER').filtered(realm_id);
    var encpwd = psw_encryption(user_pw);
    if (user_pw == "FACEBOOK" || user_pw.length != 0) { //회원가입이 페이스북으로 진행할경우 비밀번호에 FASCEBOOK 입력
      var user_length = realm.objects('USER').length;
      var user_checker = realm_id_checker.length;
      var user_pid = 200000 + user_length;
      var user_serial = "PH0100000" + user_pid;
      if (user_checker == 0) { // is not find user_id
        realm.write(() => {
          let user = realm.create('USER', {
            user_id: user_id,
            user_pid: user_pid,
            user_pw: encpwd,
            user_serial: user_serial,
            join_type: join_type,
          });
        });
        var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|SUCCESS|" + "" + user_pid + "|";
        var dbmsg = "DB|D01|" + user_pid + "|" + user_serial + "|" + user_id + "|" + encpwd + "|" + join_type + "|";

        console.log(msg);
        write_log("policy_child register : " + msg)
        process.send(msg);
        addon_child.send_data(dbmsg);
      }
      else {
        console.log("이미 존재하는 ID입니다.");
        // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
        var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
        process.send(msg);
        console.log(msg);
        write_log("이미 존재하는 ID입니다.")
        write_log("policy_child register : " + msg)

      }
    }
  }

  function login(dicdata) {
    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var tcp_fd = command_line['data3'];
    var user_id = command_line['data4'];
    var user_pw = command_line['data5'];
    var join_type = parseInt(command_line['data6']);

    var encpwd = psw_encryption(user_pw);
    var user_check = 'user_id = "' + user_id + '" AND user_pw = "' + encpwd + '"';
    var facebook_check = 'user_id = "' + user_id + '"';

    var now = Date.now();

    let user_checker = realm.objects('USER').filtered(user_check);
    let facebook_checker = realm.objects('USER').filtered(facebook_check);

    if (user_checker.length > 0) { //if user is found
      var user_sim_check = 'imsi = "' + user_checker[0].imsi + '" AND expire_match_date >"' + now + '"';
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
      if (facebook_checker[0].user_pw == 'FACEBOOK') {
        //페이스북 로그인일경우
        //심구매 유저일경우

        if (user_sim_checker.length > 0) {

          var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|SUCCESS|" + user_checker[0].user_serial + "|" + user_checker[0].credit + "|1[" + user_checker[0].user_sim_imis + ":" + user_sim_checker[0].msisdn + ":" + timeConverter(user_sim_checker[0].expire_match_date) + "]|";
          process.send(msg);
          console.log("sim o", user_checker[0], msg);
          write_log("policy_child login sim o : " + msg)

        }
        else {
          //심구매하지 않는 유저일경우
          var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|SUCCESS|" + user_checker[0].user_serial + "|" + user_checker[0].credit + "|1[" + user_checker[0].user_sim_imis + ":" + 0 + ":" + timeConverter(0) + "]|";
          process.send(msg);
          console.log("sim x", user_checker[0], msg);
          write_log("policy_child login sim x : " + msg)
        }
      }
      else {

        if (user_sim_checker.length > 0) { //심구매 유저일경우
          var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|SUCCESS|" + user_checker[0].user_serial + "|" + user_checker[0].credit + "|1[" + user_checker[0].user_sim_imis + ":" + user_sim_checker[0].msisdn + ":" + timeConverter(user_sim_checker[0].expire_match_date) + "]|";
          process.send(msg);
          console.log("sim o", user_checker[0], msg);
          write_log("policy_child login sim o : " + msg)

        }
        else { //심구매하지 않는 유저일경우
          var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|SUCCESS|" + user_checker[0].user_serial + "|" + user_checker[0].credit + "|1[" + user_checker[0].user_sim_imis + ":" + 0 + ":" + timeConverter(0) + "]|";
          process.send(msg);
          console.log("sim x", user_checker[0], msg);
          write_log("policy_child login sim x : " + msg)

        }
      }

    }
    else { //if user is not found
      // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
      var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
      process.send(msg);
      console.log("sim x", user_checker[0], msg);
      write_log("policy_child login user is not found sim x : " + msg)
    }
  }


  function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp);
    var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
    return time;
  }

  function fcm_key_renewal(dicdata) {
    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var user_serial = command_line['data3'];
    var fcm_key = command_line['data4'];
    var user_serial_check = 'user_serial = "' + user_serial + '"';

    var user_serial_checker = realm.objects('USER').filtered(user_serial_check);
    if (user_serial_checker.length > 0) {
      realm.write(() => {
        user_serial_checker[0].fcm_push_key = fcm_key;
      });
      console.log("SUCCESS : fcm_push_key is updated");
      write_log("policy_child fcm_key_renewal SUCCESS : fcm_push_key is updated");
      var msg = command + "|" + sub_command + "|" + seq + "|SUCCESS|";
      var dbmsg = "DB|D02|" + user_serial + "|" + fcm_key + "|";
      process.send(msg);
      addon_child.send_data(dbmsg);
      console.log(msg);
      write_log("policy_child fcm_key_renewal SUCCESS  dbmsg : " + dbmsg + " msg : " + msg);
    }
    else {
      console.log("ERR-fcm_push_key: user_SERIAL is not found");
      write_log("policy_child fcm_key_renewal ERR: user_SERIAL is not found");

      // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
      var msg = command + "|" + sub_command + "|" + seq + "|FAIL|";
      process.send(msg);
      console.log(msg);
      write_log("policy_child fcm_key_renewal ERR : " + msg);
    }
  }

  function voip_key_renewal(dicdata) {
    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var user_serial = command_line['data3'];
    var voip_key = command_line['data4'];
    var user_serial_check = 'user_serial = "' + user_serial + '"';
    var user_serial_checker = realm.objects('USER').filtered(user_serial_check);
    if (user_serial_checker.length > 0) {
      realm.write(() => {
        user_serial_checker[0].voip_push_key = voip_key;
      });
      var msg = command + "|" + sub_command + "|" + seq + "|SUCCESS|";
      var dbmsg = "DB|D03|" + user_serial + "|" + voip_key + "|";

      process.send(msg);
      addon_child.send_data(dbmsg);
      console.log(msg);
      write_log("policy_child voip_key_renewal : " + msg);

    }
    else {
      // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
      var msg = command + "|" + sub_command + "|" + seq + "|FAIL|";
      process.send(msg);
      console.log(msg);
      write_log("policy_child voip_key_renewal : " + msg);

    }
  }
  //recv : Policy|TS07|Seq|serial|id|auto_flag|
  //send : websock_fd, id , auto_flag

  function auto_flag_renewal(dicdata) {

    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var user_serial = command_line['data3'];
    var id = command_line['data4'];
    var auto_flag = command_line['data5'];

    try {
      var user_check = 'user_serial = "' + user_serial + '" AND user_id = "' + id + '"';
      var user_checker = realm.objects('USER').filtered(user_check);

      if (user_checker.length == 1) { //user 정보가 맞을경우
        realm.write(() => {
          user_checker[0].auto_flag = parseInt(auto_flag);
        });
        console.log("auto_flag_renewal success");
        //Policy|CS6|success|auto_flag|
        var msg = command + "|" + sub_command + "|" + seq + "|success|" + auto_flag + "|"
        var dbmsg = "DB|D04|" + user_checker[0].user_pid + "|" + auto_flag + "|"

        write_log("policy_child auto_flag_renewal msg : " + msg);
        write_log("policy_child auto_flag_renewal dbmsg : " + dbmsg);
        process.send(msg);
        addon_child.send_data(dbmsg);

      }
      else { // user 정보가 맞지 않을경우
        console.log("auto_flag renewal false : 맞지 않는 유저 정보입니다.");
        var msg = command + "|" + sub_command + "|" + seq + "|fail|" + auto_flag + "|"
        process.send(msg);
        write_log("policy_child auto_flag_renewal error msg : " + msg);

      }

    }
    catch (e) {
      console.log(e, " auto_flag_renewal error")
      write_log("policy_child auto_flag_renewal error: " + e);

    }
  }

  function buy_sim(dicdata) {
    //Policy|CS2|Seq|serial|id|carrier|join_app_type|order_id|event_flag|
    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var user_serial = command_line['data3'];
    var user_id = command_line['data4'];
    var mobileType = command_line['data5'];
    // var join_app_type = parseInt(command_line['data6']);//everytt thepay 사용자 구준용도
    //SIM에서 imsi가 존재해야하고 user_id,user_pid가 없어야한다.
    var now = Date.now();

    var sim_price = global_value.sim_price; //500
    var seven = global_value.expire_match_addtional_days;



    if (mobileType == 'smart') {
      var Type = 1;
    }
    else if (mobileType == 'globe') {
      var Type = 2;
    }
    else if (mobileType == 'Telkom') {
      var Type = 3;
    }
    else if (mobileType == 'XL') {
      var Type = 4;
    }
    try {
      var user_check = 'user_id = "' + user_id + '" AND user_serial = "' + user_serial + '"';
      //매치가 되어있지않는 심에 대한 필터링
      let user_checker = realm.objects('USER').filtered(user_check);
      var match_sim_check = 'imsi.@size >=15 AND msisdn.@size >=8 AND sim_expire_date > "' + now + '"AND expire_match_date < "' + now + '"AND mobileType = "' + Type + '"';
      let match_sim_checker = realm.objects('SIM').filtered(match_sim_check);
      var user_sim_check = 'user_id =  "' + user_id + '"';
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);



      if (user_checker.length > 0) { //사용자 체크

        var user_credit = user_checker[0].credit;
        //user credit check

        if (user_credit >= sim_price) { // if credit is to buy
          // find use to sim

          if (user_sim_checker.length > 0) { // 심이 이미 있는경우
            var description = mobileType + " / " + user_sim_checker[0].msisdn;
            if (user_sim_checker[0].expire_match_date > now) // 심을 연장할려는 경우
            {

              console.log("SIM EXTEND")

              realm.write(() => {
                user_checker[0].credit = user_checker[0].credit - sim_price * 10; //크래딧 차감
                user_sim_checker[0].expire_match_date = user_sim_checker[0].expire_match_date + seven;
              });


              //DB 서버에 mysql에  tb_credit_history 입력하기

              var msg = command + "|CS1|" + seq + "|" + user_sim_checker[0].msisdn + "|" + user_checker[0].user_sim_imsi + "|" + user_checker[0].credit + "|" + timeConverter(user_sim_checker[0].expire_match_date) + "|0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|0|0|0|";
              process.send(msg);
              write_log("policy_child buy_sim msg : " + msg);

              var buy_sim_msg = "DB|D05|" + user_checker[0].credit + "|" + user_checker[0].user_pid + "|" + timeConverter(user_sim_checker[0].expire_match_date) + "|" + user_sim_checker[0].imsi + "|" + user_checker[0].user_id + "|" + user_checker[0].user_serial + "|" + user_sim_checker[0].msisdn + "|" + sim_price * 10 + "|0|SIM|" + user_checker[0].credit * 10 + "|100|" + timeConverter(now) + "|" + description + "|"
              addon_child.send_data(buy_sim_msg);
              write_log("policy_child buy_sim dbmsg : " + buy_sim_msg);

            }
            else { //심을 구매하는 경우
              var msg = "Policy|CS2|Seq|not available number|-100|";
              process.send(msg)
              write_log("policy_child buy_sim error : " + msg);
            }
          }
          else { //심이 없는경우
            if (match_sim_checker.length > 0) {
              console.log("BUY SIM ")

              //크래딧 500 차감, 심과 사용자 매칭, tb_credit_history입력
              realm.write(() => {
                user_checker[0].credit = user_checker[0].credit - sim_price * 10; //크래딧 차감
                user_checker[0].user_sim_imsi = match_sim_checker[0].imsi;
                match_sim_checker[0].user_pid = user_checker[0].user_pid;
                match_sim_checker[0].user_id = user_checker[0].user_id;
                match_sim_checker[0].user_serial = user_checker[0].user_serial;
                match_sim_checker[0].expire_match_date = now + seven;
              });

              //DB 서버에 mysql에  tb_credit_history 입력하기
              var msg = command + "|CS1|" + seq + "|" + match_sim_checker[0].msisdn + "|" + user_checker[0].user_sim_imsi + "|" + user_checker[0].credit + "|" + timeConverter(match_sim_checker[0].expire_match_date) + "|0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|0|0|0|";
              console.log(match_sim_checker[0].msisdn);
              process.send(msg);
              write_log("policy_child buy_sim msg : " + msg);
              var buy_sim_msg = "DB|D05|" + user_checker[0].credit + "|" + user_checker[0].user_pid + "|" + timeConverter(match_sim_checker[0].expire_match_date) + "|" + match_sim_checker[0].imsi + "|" + user_checker[0].user_id + "|" +
                user_checker[0].user_serial + "|" + match_sim_checker[0].msisdn + "|" + sim_price * 10 + "|0|SIM|" +
                user_checker[0].credit * 10 + "|100|" + timeConverter(now) + "|" + description + "|";
              addon_child.send_data(buy_sim_msg);
              write_log("policy_child buy_sim  buy_sim_msg: " + buy_sim_msg);

            }
            else {
              console.log("사용가능할수 있는 심이 없습니다.")
              var msg = "Policy|CS2|Seq|not available number|-100|";
              write_log("policy_child buy_sim msg error : " + msg);
              process.send(msg)
            }
          }

        }
        else {
          console.log("크래딧이 부족합니다. ")
          var msg = "Policy|CS2|Seq|not enough credit|-101|";
          write_log("policy_child buy_sim msg error : " + msg);
          process.send(msg, );

        }
      }
      else {
        console.log(user_checker.length);
        console.log("존재하지 않는 사용자입니다.")
        write_log("policy_child buy_sim  error : 존재하지 않는 사용자입니다");

      }

    }
    catch (e) {
      console.log(e, "buy_sim error")
      write_log("policy_child buy_sim  error : " + e);
    }
  }

  function top_up(dictdata) {
    //Policy|CS7|Seq|serial|id|topup_price|join_app_type|description|topup_method|order_id|event_flag|
    var command_line = dicdata;
    var command = command_line['command'];
    var sub_command = command_line['data1'];
    var seq = command_line['data2'];
    var user_serial = command_line['data3'];
    var user_id = command_line['data4'];
    var topup_price = command_line['data5'];
    var join_app_type = command_line['data6'];
    var description = command_line['data7'];
    var topup_method = command_line['data8'];
    var order_id = command_line['data9'];
    var event_flag = command_line['data10'];
    //update tb_user set credit = credit + 7500 , charge_cnt = charge_cnt+1 , coupon =coupon+1 where pid = 3004
    //UPDATE tb_user_test set credit = credit + 7500, charge_cnt = charge_cnt + 1, coupon =coupon+1 WHERE pid = user_checker[0].user_pid

    try {
      var user_check = 'user_id = "' + user_id + '" AND user_serial = "' + user_serial + '"';
      let user_checker = realm.objects('USER').filtered(user_check);
      let sim_checker = realm.objects('SIM').filtered(sim_check);
      var user_sim_check = 'user_pid =  "' + user_checker[0].user_pid + '"';
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

      realm.write(() => {
        user_checker[0].credit = user_checker[0].credit + topup_price;
      })
      var charge_credit = topup_price;
      var db_top_up_msg = "DB|D06|" + user_checker[0].user_pid + "|" + user_checker[0].user_id + "|" +
        user_checker[0].user_serial + "|" + charge_credit + "|1|1|" + description + "|" + timeConverter(Date.now()) + "|" +
        user_checker[0].credit + "|" + event_flag + "|" + user_sim_checker[0].msisdn + "|ACCOUNT|0|TOPUP|";
      var msg = "Policy|CS7|" + seq + "|success|" + topup_price + "|";
      write_log("policy_child top_up  msg : " + msg);
      write_log("policy_child top_up  dbmsg : " + db_top_up_msg);
      process.send(msg);
      addon_child.send_data(db_top_up_msg);
    }
    catch (e) {
      console.log(e, " ERROR top_up");
      write_log("policy_child top_up error : " + e);
    }
  }
