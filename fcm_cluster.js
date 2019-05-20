const crypto = require('crypto');
var pdu = require('node-pdu');
var apn = require('apn');
var FCM = require('fcm-node');

require('date-utils');
var fs = require('fs');
var options = { encoding: 'utf8', flag: 'a' };

function write_log( data) {
  var dt = new Date();

  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
//  var data = 'Hello FileSystem';
  //fs.appendFile('./vina_log.txt', data, options);
  fs.writeFile('inapp_log.txt','['+d+']'+ data+'\n', options, function(err) {
    //  console.log('비동기적 파일 쓰기 완료');
  });

//  fs.writeFileSync('text2.txt', data, 'utf8');
//  console.log('write_log');
}

var firebase = require('firebase');
var everyttadmin = require("firebase-admin");
var everyttAccount = require("./firebases/innitt.json");
var thepayAccount = require("./firebases/thechat.json");

var everytt_options = {
        gateway : "gateway.sandbox.push.apple.com",
        cert: './keys/inniTT.pem',
        key: './keys/inni_key.pem'
    };

var thepay_options = {
        gateway : "gateway.sandbox.push.apple.com",
        cert: './keys/thepay.pem',
        key: './keys/thepay_key.pem'
    };


//everyttadmin.initializeApp(everyttAccount);
let everytt_service = new apn.Provider({
  cert: "keys/inniTT.pem",
  key: "keys/thepay.pem",
});

let thepay_service = new apn.Provider({
  cert: "keys/inniTT.pem",
  key: "keys/thepay.pem",
});
/*GlobalSetting */

var COUNTRY_CDOE = '62' ;

/*GlobalSetting */

everyttadmin.initializeApp({
  credential: everyttadmin.credential.cert(everyttAccount),
  databaseURL: "https://every-tt.firebaseio.com"
});

var thepayAdmin = everyttadmin.initializeApp({
  credential: everyttadmin.credential.cert(thepayAccount),
  databaseURL: "https://thechat-ios.firebaseio.com"
}, 'thepay');


console.log(everyttadmin.app().name);  // '[DEFAULT]'
console.log(thepayAdmin.name);     // 'other'

//#define FCM_AUTH		"Authorization:key=AAAAvCJGi-I:APA91bHGMJDJYuwqXKJodTKXt7L1_5ROO4_wLAGjdyJROLtr7cxsECoExoggrceqPHTbZIC4Vh_V6qZMSrltKY1tfvHklcQwvWmd_GZq5nPjZ_jm1FzoN_Wsla0j9JIZjvAXLf_OX8zS"
var android_serverkey = 	"AAAAvCJGi-I:APA91bHGMJDJYuwqXKJodTKXt7L1_5ROO4_wLAGjdyJROLtr7cxsECoExoggrceqPHTbZIC4Vh_V6qZMSrltKY1tfvHklcQwvWmd_GZq5nPjZ_jm1FzoN_Wsla0j9JIZjvAXLf_OX8zS"

var ios_serverkey = 	"AAAAvCJGi-I:APA91bHGMJDJYuwqXKJodTKXt7L1_5ROO4_wLAGjdyJROLtr7cxsECoExoggrceqPHTbZIC4Vh_V6qZMSrltKY1tfvHklcQwvWmd_GZq5nPjZ_jm1FzoN_Wsla0j9JIZjvAXLf_OX8zS"

var android_thepay_serverkey = 	"AAAAvCJGi-I:APA91bHGMJDJYuwqXKJodTKXt7L1_5ROO4_wLAGjdyJROLtr7cxsECoExoggrceqPHTbZIC4Vh_V6qZMSrltKY1tfvHklcQwvWmd_GZq5nPjZ_jm1FzoN_Wsla0j9JIZjvAXLf_OX8zS"

var ios_thepay_serverkey = 	"AAAAvCJGi-I:APA91bHGMJDJYuwqXKJodTKXt7L1_5ROO4_wLAGjdyJROLtr7cxsECoExoggrceqPHTbZIC4Vh_V6qZMSrltKY1tfvHklcQwvWmd_GZq5nPjZ_jm1FzoN_Wsla0j9JIZjvAXLf_OX8zS"

var Queue = require('bull');
var FCMDataQue = new Queue('FCMDataQue');
var FCMJobQue = new Queue('FCMJobQue');
var addon = require('bindings')('addon');
addon.setCallback(9999, data_test);
//addon.setCallback(9081, data_test);

/*function */
function check_phone_number( number ){
  var check_number ;
  if( number.substring(0,1) == '+' ) number = number.substr(1);

  if( number.substring(0,COUNTRY_CDOE.length) == COUNTRY_CDOE ) check_number = "0"+ number.substr(COUNTRY_CDOE.length-1);
  else check_number = number ;

  return check_number ;
}

function timeConverter(UNIX_timestamp){
    var date = new Date(UNIX_timestamp*1000);
    var year = date.getFullYear();
    var month = ("0"+(date.getMonth()+1)).substr(-2);
    var day = ("0"+date.getDate()).substr(-2);
    var hour = ("0"+date.getHours()).substr(-2);
    var minutes = ("0"+date.getMinutes()).substr(-2);
    var seconds = ("0"+date.getSeconds()).substr(-2);

    return year+"-"+month+"-"+day+" "+hour+":"+minutes+":"+seconds;
}

function make_sms_data( body, senderID, senderName , peerNumber, date ){

 var add_data ={};

 add_data["content"] = body;

 add_data["senderID"] = senderID;
 add_data["senderName"] = senderName;
 add_data["peerNumber"] = peerNumber;
 add_data["created"] = timeConverter(date);//date.format("YYYY-MM-DD HH:mm:ss");

 add_data["txState"] = "success";
 add_data["sequence"] = "0";

 JSON.stringify(add_data) ;
 return add_data ;
}

function make_sms_data2( body,calledID,  senderID, senderName , peerNumber, date ){

 var add_data ={};

 add_data["lastDate"] = timeConverter(date);;
 add_data["myNumber"] = calledID ;
 add_data["name"] = senderName;
 add_data["peerName"] = senderName;
 add_data["peerNumber"] = peerNumber;
 add_data["read"] = 'false';
 add_data["sequence"] = "0";

 JSON.stringify(add_data) ;
 return add_data ;
}

function make_sms_data_document( body, date ){

  var add_data1 ={};
  var add_data2 ={};
  var add_data3 ={};


  add_data1["path"] = "read";
  add_data1["value"] = "false";

  add_data2["path"] = "lastMsg";
  add_data2["value"] = body;

  add_data3["path"] = "lastDate";
  add_data3["value"] =  timeConverter(date);

  var add_data= {add_data1, add_data2, add_data3} ;

  JSON.stringify(add_data) ;
  return add_data ;
}

function make_sms_ack( result ){

  var add_data1 ={};


  add_data1["path"] = "txState";
  add_data1["value"] = result;


  var add_data= {add_data1} ;

  JSON.stringify(add_data) ;
  return add_data ;
}

function make_push_ios_msg( fcm_key,  body, send_msg ){

  var add_data1 ={};
  var add_data2 ={};
  var add_data3 ={};

  add_data2["body"] = body;
  add_data2["title"] = 'SMS';

  add_data1["to"] = fcm_key ;
  add_data1["notification"] = add_data2;
  add_data1["priority"] = "high";

  add_data3["message"] = send_msg;
  add_data1["data"] = add_data3


  //var add_data= {add_data1, add_data2, add_data3} ;

  JSON.stringify(add_data1) ;
  return add_data1 ;
}

function make_push_android_msg( fcm_key,  send_msg ){

  var add_data1 ={};
  var add_data2 ={};
  var add_data3 ={};



  add_data1["to"] = fcm_key ;

  add_data1["priority"] = "high";

  add_data3["message"] = send_msg;
  add_data1["data"] = add_data3


  //var add_data= {add_data1, add_data2, add_data3} ;

  JSON.stringify(add_data1) ;
  return add_data1 ;
}



function make_push_call_ios_msg( fcm_key,  body, send_msg ){

  var add_data1 ={};
  var add_data2 ={};
  var add_data3 ={};

  add_data2["body"] = body;
  add_data2["title"] = 'SMS';

  add_data1["to"] = fcm_key ;
  add_data1["notification"] = add_data2;
  add_data1["priority"] = "high";

  add_data3["message"] = send_msg;
  add_data1["data"] = add_data3


  //var add_data= {add_data1, add_data2, add_data3} ;

  JSON.stringify(add_data1) ;
  return add_data1 ;
}
/*function */

FCMJobQue.process(function(job, done) {
  // console.log("jobQueue : ", job.data.msg);
  console.log("jobque");
  DB_classifier(job.data.msg);
  done();
});

function data_test(msg) {
  console.log(msg);
  console.log("Data in")
  console.log(msg)

  FCMDataQue.add({
    msg: msg
  });
}






function parser(data) {
  var str = data;
  var command_divied = str.split(",");
  var job_que = [];
  command_divied.forEach(function(dummy) {
    var parser_data = dummy.split("|");
    var dict = {};
    for (var i = 0; i < parser_data.length; i++) {
      if (i === 0) { //command
        dict["command"] = parser_data[0];
      }
      else {
        dict["data" + i] = parser_data[i];
      }
    }
    FCMJobQue.add({
      msg: dict
    });
  });
};

function DB_classifier(data) {
  switch (data['command']) {
    case 'TS10':    //심정보 전달
      console.log("sim info");
      send_fcm_sim_Info( data );
      break;
    case 'KS00':  // incomming sms
      console.log("incomming sms");
      send_fcm_sms( data );
      break;
    case 'SC01':  // incomming sms
      console.log("outgoing sms");
      send_fcm_sms_ack( data );
      break;
    case 'CA02':  // incomming call
      console.log("incomming call");
      send_fcm_call( data );
      break;
    default:
      console.log(data);
  }
}

function make_push_call_data( type, data,  ){

}

function make_push_msg_data( ){

}

function send_fcm_call(dictdata) {
  // CA02|VINA000000000000005 1|1548392523 2|MAKECALL 3|13.229.224.17 4|10057 5|0392451176 6|15571986454018948 7|0 8|1557198635 9|fcm-key 10/voip-key 11/join_app_type 13/os_type 12/

  var command_line = dictdata;
  var fcm_key = command_line['data10'] ;
  var voip_key = command_line['data11'] ;
  var join_app_type = command_line['data12'] ;
  var os_type = command_line['data13'] ;

  var msg_serial = command_line['data1'] ;
  var msg_appSeq = command_line['data2'] ;
  var msg_type = command_line['data3'] ;
  var msg_ip = command_line['data4'] ;
  var msg_port = command_line['data5'] ;
  var msg_callerID = command_line['data6'] ;
  var msg_seq = command_line['data7'] ;
  var msg_codec_type = command_line['data8'] ;
  var msg_calltime = command_line['data9'] ;


  var server_key, client_token ;
  var content_available ="";
  var send_msg ="";
  var push_data ="";

  var server_key, client_token ;


  if( command_line['data12']  == '1' ) {

    let note = new apn.Notification({
      alert:  "Breaking News: I just sent my first Push Notification",
    });

    note.topic = "<bundle identifier>";

    //console.log(`Sending: ${note.compile()} to ${tokens}`);
    note.caller_id = msg_callerID ;
    note.time = msg_calltime;
    note.ip = msg_ip;
    note.port= msg_port;
    note.call_seq = msg_appSeq ;
    note.codec_type= msg_codec_type;
    note.sound =  'default';
    note.badge =  10;

    // OS - ios

    if( command_line['data13']  == '1' ){
      server_key = ios_thepay_serverkey ;

      thepay_service.send(note, voip_key).then( result => {
          console.log("sent:", result.sent.length);
          console.log("failed:", result.failed.length);
          console.log(result.failed);
      });

    }
    else{
      server_key = ios_serverkey ;
      everytt_service.send(note, voip_key).then( result => {
          console.log("sent:", result.sent.length);
          console.log("failed:", result.failed.length);
          console.log(result.failed);
      });
    }




  // The topic is usually the bundle identifier of your application.







  }else{
    // OS - android
    if( command_line['data13']  == '1' ){
      server_key = android_thepay_serverkey ;
    }
    else{
      server_key = android_serverkey ;
    }

    var call_msg =  command_line['command']+"|"+command_line['data1']+"|"+command_line['data2']+"|"+command_line['data3']+"|"+command_line['data4']+"|"+command_line['data5']+"|" +command_line['data6']+"|" +command_line['data7']+"|" +command_line['data8']+"|" +command_line['data9']+"|"  ;

    push_data = make_push_android_msg( fcm_key,  call_msg );
  }

  var fcm = new FCM(server_key);

  fcm.send(push_data, function(err, response) {
    if (err) {
        console.error('Push메시지 발송에 실패했습니다.');
        console.error(err);
        return;
    }

    console.log('Push메시지가 발송되었습니다.');
    console.log(response);
  });


  console.log("send_fcm_sim_Info")
}


function send_fcm_sms(dictdata) {
//  KS00|TTID000000000005057 1|1557284576018225 2|07912618485400f924038199f90000915080012074829a50f9bbfd06add1f5797d0eaad3d7a0a09b1c0e818870fa3aec06adeb6f7a189476d3cb7277990e8a1d85207159ce0eafeba01b5a0e4287ddf930480aafc9c5207ad80d0f83e06539bb0e4acfd3a03a3bec3e8740cb323dbd066583a03a7d0d0aafe9697b789e06cdcbebb03cec3ebb4049b7f90d1aa3c3741d08cf768ddfae3419840d4e653021 3| fcm key 4| join_type 5|  os_type 6 / id -7 /

  var command_line = dictdata;
  var fcm_key = command_line['data4'] ;
  var join_app_type = command_line['data5'] ;
  var os_type = command_line['data6'] ;

  var msg_serial = command_line['data1'] ;
  var msg_seq = command_line['data2'] ;
  var msg_pdu = command_line['data3'] ;
  var msg_id = command_line['data7'] ;

  var server_key, client_token ;
  var content_available ="";
  var send_msg ="";
  var push_data ="";
  var db , ref ;

  console.log('send_fcm_sms');

  if( os_type  == '1' ) {
    // OS - ios

    if( join_app_type  == '1' ){
      server_key = ios_thepay_serverkey ;
      db = thepayAdmin.database();
    //  ref = db.ref("thechat-ios");
    }
    else{
      server_key = ios_serverkey ;
      db = everyttadmin.database();
    //  ref = db.ref("every-tt");
    }



    var pdu_data = pdu.parse(msg_pdu) ;
    var body = pdu_data._ud._data ;
    var calledID = pdu_data._sca._encoded;
    var callerID = pdu_data._address._phone;
    var data     = pdu_data._scts._time;

    //전화번호 체크
    var peerNumber = check_phone_number( callerID) ;


    var chatData = make_sms_data( body, callerID, callerID , callerID, date );
    var chatData_Documnet = make_sms_data_document( body, date );


    var found = false;
    var usersRef = db.collection( msg_id );
    if( usersRef != null ){

      var snapshot = usersRef.doc();
      for (var user in snapshot){
        var ID = user.id();

        if( user['peerNumber'] == peerNumber ){
          var colRef = usersRef.doc(ID).collection('thread');

          colRef.add(chatData);
          usersRef.document(ID).update(chatData_Documnet);

          found = true;
        }

      }

    }

    if( found == false ){
      var chnnelData = make_sms_data2( body, calledID, callerID, callerID , callerID, date );

      var addedDocRef = db.collection(msg_id).doc();
      addedDocRef.set(chnnelData);
      addedDocRef.collection('thread').add(chatData);
    }

    send_msg = "KF00|"+body+"|"+callerID+"|" ;

    push_data = make_push_ios_msg( fcm_key,  body, send_msg );

  }else{
    // OS - android
    if( join_app_type  == '1' ){
      server_key = android_thepay_serverkey ;
    }
    else{
      server_key = android_serverkey ;
    }
    send_msg = command_line['command']+"|"+command_line['data1']+"|"+command_line['data2']+"|"+command_line['data3']+"|" ;

    push_data = make_push_android_msg( fcm_key,  send_msg );


    console.log('push_data ['+ send_msg+']');

  }

  var fcm = new FCM(server_key);

  fcm.send(push_data, function(err, response) {
    if (err) {
        console.error('Push메시지 발송에 실패했습니다.');
        write_log( send_msg + 'Push fail' +err );
        console.error(err);
        return;
    }
    write_log( send_msg + 'Push Success' );
    console.log('Push메시지가 발송되었습니다.');
    console.log(response);
  });


  console.log("send_fcm_sim_Info" + server_key)
}

function send_fcm_sms_ack(dictdata) {
//  KS00|TTID000000000005057 1|1557284576018225 2|07912618485400f924038199f90000915080012074829a50f9bbfd06add1f5797d0eaad3d7a0a09b1c0e818870fa3aec06adeb6f7a189476d3cb7277990e8a1d85207159ce0eafeba01b5a0e4287ddf930480aafc9c5207ad80d0f83e06539bb0e4acfd3a03a3bec3e8740cb323dbd066583a03a7d0d0aafe9697b789e06cdcbebb03cec3ebb4049b7f90d1aa3c3741d08cf768ddfae3419840d4e653021 3| fcm key 4| join_type 5|  os_type 6 / id -7 /
  var command_line = dictdata;

  var join_app_type = command_line['data5'] ;
  var os_type = command_line['data6'] ;

  var msg_result = command_line['data2'] ;
  var msg_seq = command_line['data2'] ;
  var msg_id = command_line['data7'] ;
  var msg_calledID = command_line['data7'] ;

  var db , ref ;

  if( os_type  == '1' ) {
    // OS - ios

    if( join_app_type  == '1' ){
      server_key = ios_thepay_serverkey ;
      db = thepayAdmin.database();
    //  ref = db.ref("thechat-ios");
    }
    else{
      server_key = ios_serverkey ;
      db = everyttadmin.database();
    //  ref = db.ref("every-tt");
    }

    //전화번호 체크
    var peerNumber = check_phone_number( msg_calledID) ;


    var chatData = make_sms_ack( msg_result );


    var found = false;
    var usersRef = db.collection( msg_id );
    if( usersRef != null ){

      var snapshot = usersRef.doc();
      for (var user in snapshot){
        var ID = user.id();

        if( user['peerNumber'] == peerNumber ){
          var colRef = usersRef.doc(ID).collection('thread');

           var snapshot2 = colRef.doc();
             for (var sms in snapshot2){
               if($sms['sequence'] == msg_seq ){
                           //printf("sequece: %s " , $sequence);
                           var docID = sms.id();
                          // printf("docID : %s\n" , $docID);
                           var docRef = colRef.doc(docID);
                          // printf("docRef");
                           docRef.update(chatData);

                           return;
                       }
             }
        }

      }

    }


  }




  console.log("send_fcm_sim_Info")
}

function send_fcm_sim_Info(dictdata) {
  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var user_pid = command_line['data2'];
  var user_serial = command_line['data3'];
  var user_id = command_line['data4'];
  var user_pw = command_line['data5'];
  var join_type = command_line['data6'];

  console.log("send_fcm_sim_Info")
}



FCMDataQue.process(function(job, done) {
  // console.log("dataQueue")
  console.log("dataque");
  parser(job.data.msg);
  done();
});
