const https = require('https');
const http = require('http');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var md5 = require('md5');
var htmlparser = require('htmlparser2');
var addon = require('bindings')('addon');
var curl = require('curl');

var addon_master = require('bindings')('addon_child');
addon_master.setConnect(2222, "127.0.0.1");
var addon_db = require('bindings')('addon_child');
addon_db.setConnect(5555, "127.0.0.1");
addon.setCallback(5959, data_test);

var Queue = require('bull');
var CHDataQueue = new Queue('CHDataQueue');
var CHJobQueue = new Queue('CHJobQueue');
var tripledes = require('crypto-js/tripledes')


function data_test(msg) {
  console.log(msg);
  console.log("Data in")
  CHDataQueue.add({
    msg: msg
  });
}

CHJobQueue.process(function(job, done) {
  // console.log("jobQueue : ", job.data.msg);
  console.log("jobque");
  CH_classifier(job.data.msg);
  done();
});
CHDataQueue.process(function(job, done) {
  // console.log("dataQueue")
  console.log("dataque");
  parser(job.data.msg);
  done();
});

function parser(data) {
  var str = data;
  var command_divied = str.split("END");
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
    CHJobQueue.add({
      msg: dict
    });
  });
};

// sim_charge CH_classifier
function CH_classifier(data) {
  console.log("CH_classifier")
  switch (data['data1']) {
    //mcc 심 국가 코드를 통해서 비교
    case '515':
      console.log("Philippines");
      Philippines_loadcentral(data)
      break;
    case '510':
      console.log("Indonesia");
      Indonesia_mobilepulsa(data)
      break;

    case 'INNI':
      console.log("recv Indonesia");
      recv_Indonesia(data)
      break;
    case '452':
      console.log("Vietnam");
      test_Vietnam_intergration(data)
      break;
    case '414':
      console.log("Myanmar");
      Myanmar_charge(data)
      break;
    default:
      console.log(data);
  }
}

//테스트용 서비스하는 국가별 CAIIRE_IDC 찾기

const global_carrier_pcode = {
  51503: "SM100",
  51502: "GMX100",
  51010: "htelkomsel25000",
  51001: "hindosat25000",
  51011: "xld25000",
  45201: "601",
  45202: "602",
  45204: "600",
}

//배트남 통신사별 코드
const vietnam_type = {

  601: "VMS",
  602: "VNP",
  600: "VTT",
}

//https req 데이터를 받아서 파싱하는 함수

function https_req_parse(url) {
  return new Promise((resolve, reject) => {


    const req = https.get(url, (res) => {

      var parser_result = [];
      let data = "";
      var parser = new htmlparser.Parser({
        ontext: function(text) {
          parser_result.push(text);
          console.log(text)
        }
      }, {
        decodeEntities: true
      });
      res.on('data', (d) => {
        data += d;
      });
      res.on('end', () => {
        console.log("ssssss" + data);
        parser.write(data);
        resolve(parser_result)
      });


    }).on('error', (e) => {
      console.error(e);
    });
    req.end();
  })

}

//http req 데이터를 받아서 파싱하는 함수
function http_req_parse(url) {
  return new Promise((resolve, reject) => {


    const req = http.get(url, (res) => {

      var parser_result = [];
      let data = "";
      var parser = new htmlparser.Parser({
        ontext: function(text) {
          parser_result.push(text);
          console.log(text)
        }
      }, {
        decodeEntities: true
      });
      res.on('data', (d) => {
        data += d;
      });
      res.on('end', () => {
        console.log("ssssss" + data);
        parser.write(data);
        resolve(parser_result)
      });


    }).on('error', (e) => {
      console.error(e);
    });
    req.end();
  })

}
//미얀마 심 충전 함수
function Myanmar_charge(dictdata) {
  // https://loadcentral.net/sellapi.do?uid=uid&auth=md5_pwd&pcode=ztest1&to
  // =09210000001&rrn=123456789012
  var mcc = dictdata['data1'];
  var mnc = dictdata['data2'];
  var imsi = dictdata['data3'];
  var msisdn = dictdata['data4'];
  var simbank_name = dictdata['data5'];
  var charge_amount = 100;

  console.log("Myanmar_charge")

  // var client_pcode = "";
  // if (typeof global_carrier_pcode[mcc + mnc] == 'undefined') {
  //   client_pcode = "NONE";
  //   console.log(client_pcode)
  // }
  // else {
  //   client_pcode = global_carrier_pcode[mcc + mnc];
  //   console.log(client_pcode)
  //
  // }
  var url = "https://web.everytt.com/mmTT_charge/mmCharge.php?mobile="+msisdn+"&charge_amount="+charge_amount
  console.log(url)
  var charge_result = https_req_parse(url)

  charge_result.then(function(result) {



    let mobile_number = result[0]; // result reference number
    let RESP = result[3]; // success fail flag

    console.log("mobile_number " + mobile_number)
    console.log("RESP " + RESP)

    //0 일경우 성공
    var now = Date.now()
    if (RESP == "Success") {
    // if(true){
      //성공일 경우 realm db 업데이트할 내용들 chiil_process에 넘기고 mysql DB에 넣어주기위해 DBMSG을 DB_CHILD에 전달한다.
      var msg = "MP|CHARGE|" + 0 + "|" + imsi + "|" + charge_amount + "|";
      var dbmsg = "DB|CHARGE|" + 0 + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + charge_amount + "|" + now + "|";
      console.log(msg)
      console.log(dbmsg)

      addon_master.send_data(msg);
      addon_db.send_data(dbmsg);

    }
    else {
      // 실패에 대한 결과를 mysql DB에 넣어주기위해 DBMSG을 DB_CHILD에 전달한다.
      var dbmsg = "DB|CHARGE|" + 1 + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + now + "|6|";
      addon_db.send_data(dbmsg);
      console.log(dbmsg)
    }
  })
}


//베트남 심충전 함수
function test_Vietnam_intergration(dictdata) {
  // https://loadcentral.net/sellapi.do?uid=uid&auth=md5_pwd&pcode=ztest1&to
  // =09210000001&rrn=123456789012
  var mcc = dictdata['data1'];
  var mnc = dictdata['data2'];
  var imsi = dictdata['data3'];
  var msisdn = dictdata['data4'];
  var simbank_name = dictdata['data5'];
  var charge_amount = 100;

  console.log("Vietnam_intergration")

  var client_pcode = "";
  if (typeof global_carrier_pcode[mcc + mnc] == 'undefined') {
    client_pcode = "NONE";
    console.log(client_pcode)
  }
  else {
    client_pcode = global_carrier_pcode[mcc + mnc];
    console.log(client_pcode)

  }
  var url = "http://web.everytt.com/app/vinaTT/demo/test_check.php?mobile="+msisdn+"&charge_amount="+charge_amount+"&imsi="+imsi
  console.log(url)
  var charge_result = http_req_parse(url)

  charge_result.then(function(result) {



    let mobile_number = result[0]; // result reference number
    let RESP = result[1]; // success fail flag

    console.log("mobile_number " + mobile_number)
    console.log("RESP " + RESP)

    //0 일경우 성공
    var now = Date.now()
    if (RESP.includes("Successfully")) {
    // if(true){
      //성공일 경우 realm db 업데이트할 내용들 chiil_process에 넘기고 mysql DB에 넣어주기위해 DBMSG을 DB_CHILD에 전달한다.
      var msg = "MP|CHARGE|" + 0 + "|" + imsi + "|" + charge_amount + "|";
      var dbmsg = "DB|CHARGE|" + 0 + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + charge_amount + "|" + now + "|";
      console.log(msg)
      console.log(dbmsg)

      addon_master.send_data(msg);
      addon_db.send_data(dbmsg);

    }
    else {
      // 실패에 대한 결과를 mysql DB에 넣어주기위해 DBMSG을 DB_CHILD에 전달한다.
      var dbmsg = "DB|CHARGE|" + 1 + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + now + "|6|";
      addon_db.send_data(dbmsg);
      console.log(dbmsg)
    }
  })
}

function Vietnam_intergration(dictdata) {
  var mcc = dictdata['data1'];
  var mnc = dictdata['data2'];
  var imsi = dictdata['data3'];
  var msisdn = dictdata['data4'];
  var simbank_name = dictdata['data5'];
  var charge_amount = "10"
  var test_url = "http://dev.alego.vn:8080/agent_api/";
  var url = "https://api.alego.vn/agent_api/";

  var Fnc = "buyPrepaidCards";
  var Ver = "1.0";
  var AgentID = "20180516124717";
  var AccID = "5afbc5e5e4b03f51bb970ed7";
  var DataKey = "TzKNULuVzNFd9MNbcwx713Bm"; // is EncData KEY
  var now = "" + Date.now;

  var pcode = "";
  var refnumber = "DL" + now.slice(5);
  var telco = "";
  var type = "TELCO_TOPUP";
  // var card_price = "";
  var card_quantity = "1";

  if (typeof global_carrier_pcode[mcc + mnc] != 'undefined') {
    pcode = global_carrier_pcode[mcc + mnc];
    console.log(pcode);
  }
  if (typeof vietnam_type[pcode] != 'undefined') {
    telco = vietnam_type[pcode];
    console.log(pcode);
  }
  console.log("1111")
  var data = JSON.stringify(`{
    "ProductCode"   : "` + pcode + `",
    "RefNumber"   : "` + refnumber + `",
    "Telco"   : "` + telco + `",
    "Type"   : "` + type + `",
    "CustMobile"   : "` + msisdn + `",
    "CustIP"   : "127.0.0.1",
    "CardPrice"   : "` + charge_amount + `",
    "CardQuantity"   : "` + card_quantity + `",
  }`)
  console.log(data)

  var EncData = tripledes.encrypt(data, DataKey);
  console.log("3333")

  var Checksum = md5(Fnc + Ver + AgentID + AccID + EncData + DataKey);

  console.log("Checksum : " + Checksum)

  console.log("data : " + EncData)
  var send_data = JSON.stringify(`{
  "Fnc"   : "` + Fnc + `",
  "Ver"   : "` + Ver + `",
  "AgentID"   : "` + AgentID + `",
  "AccID"   : "` + AccID + `",
  "EncData"   : "` + EncData + `",
  "Checksum"   : "` + Checksum + `",
}`);

  // console.log("send_data : " + send_data)
  var charge_result = POST_req(test_url, send_data).catch(() => {})
  charge_result.then(function(result) {
    console.log(result)

  })
}

//필리핀 심 충전 함수
function Philippines_loadcentral(dictdata) {
  // https://loadcentral.net/sellapi.do?uid=uid&auth=md5_pwd&pcode=ztest1&to
  // =09210000001&rrn=123456789012
  var mcc = dictdata['data1'];
  var mnc = dictdata['data2'];
  var imsi = dictdata['data3'];
  var msisdn = dictdata['data4'];
  var simbank_name = dictdata['data5'];


  console.log("Philippines_loadcentral")

  var client_pcode = "";
  if (typeof global_carrier_pcode[mcc + mnc] == 'undefined') {
    client_pcode = "NONE";
    console.log(client_pcode)
  }
  else {
    client_pcode = global_carrier_pcode[mcc + mnc];
    console.log(client_pcode)

  }


  var uid = "jinaki"
  var pwd = "dpqmflTT1#"
  var rrn = Date.now() / 10;

  var auth = md5(md5(rrn) + md5(uid + pwd))
  console.log(auth)

  var url = "https://loadcentral.net/sellapi.do?uid=" + uid + "&auth=" + auth + "&pcode=" + client_pcode + "&to=" + msisdn + "&rrn=" + rrn;
  console.log(url)
  // var test = "https://loadcentral.net/sellapiinq.do?uid=63xxxxxxxxxx&auth=6cfa21290ed4f9cac5f366aaf2889526&rrn=123456789012"
  var charge_result = https_req_parse(url).catch(() => {});
  //요청후 받는다.
  charge_result.then(function(result) {



    let RRN = result[0]; // result reference number
    let RESP = result[1]; // success fail flag
    let TID = result[2]; //trace number
    let EBAL = result[3]; // balacne of account
    let ERR = result[4]; //error description
    console.log("sssss" + RRN)
    //0 일경우 성공
    var now = Date.now()
    if (RESP == '0') {
      //성공일 경우 realm db 업데이트할 내용들 chiil_process에 넘기고 mysql DB에 넣어주기위해 DBMSG을 DB_CHILD에 전달한다.
      var msg = "MP|CHARGE|" + RESP + "|" + imsi + "|" + EBAL + "|";
      var dbmsg = "DB|CHARGE|" + RESP + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + EBAL + "|" + now + "|";
      console.log(msg)
      console.log(dbmsg)

      addon_master.send_data(msg);
      addon_db.send_data(dbmsg);

    }
    else {
      // 실패에 대한 결과를 mysql DB에 넣어주기위해 DBMSG을 DB_CHILD에 전달한다.
      var dbmsg = "DB|CHARGE|" + RESP + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + now + "|6|";
      addon_db.send_data(dbmsg);
      console.log(dbmsg)
    }
  })
}

//받은 ㄷ이터 파싱에 쓰인다.
function xmlFormatter(mystring) {
  return mystring.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
// 인도네시아 심충전 요청 함수
function Indonesia_mobilepulsa(dictdata) {

  var mcc = dictdata['data1'];
  var mnc = dictdata['data2'];
  var imsi = dictdata['data3'];
  var msisdn = dictdata['data4'];
  var simbank_name = dictdata['data5'];
  console.log("Indonesia_mobilepulsa")

  var path = "https://testprepaid.mobilepulsa.net/v1/legacy/index";
  // var path = "https://api.mobilepulsa.net/v1/legacy/index"
  var usernameTxt = "821030786670";
  // var passwordTxt = "dpqmflTT1#";
  var passwordTxt = "1825afbdfe97b1a9";

  var date = "" + Date.now();
  var refIdTxt = simbank_name + "|" + imsi + "|" + date.slice(5);
  var signTxt = md5(usernameTxt + passwordTxt + refIdTxt);
  var client_pcode = "";

  client_pcode = global_carrier_pcode[mcc + mnc];
  console.log(client_pcode)
  var doc = `{
      "mp" : {
        "commands"   : "topup",
        "username"   : "821030786670",
        "ref_id"     : "` + refIdTxt + `",
        "hp"         : "` + msisdn + `",
        "pulsa_code" : "` + client_pcode + `",
        "sign"       : "` + signTxt + `"
    }
  }`;
  // var doc = `{
  //     "mp" : {
  //       "commands"   : "topup",
  //       "username"   : "821030786670",
  //       "ref_id"     : "` + refIdTxt + `",
  //       "hp"         : "` + msisdn + `",
  //       "pulsa_code" : "` + client_pcode + `",
  //       "sign"       : "` + signTxt + `"
  //   }
  // }`;
  console.log(doc)
  var options = {
    compact: true,
    ignoreComment: true,
    spaces: 4
  };

  var convert = require('xml-js');
  var result = convert.json2xml(doc, options);


  console.log("result  : \n" + result)



  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  var data = []
  xhr.onload = function() {
    if (xhr.readyState == 4 && xhr.status == "200") {
      var resultText = xmlFormatter(xhr.responseText);
      console.log("resultText : " + resultText)
    }
    else {
      console.error("resultText error : " + xmlFormatter(xhr.responseText));
    }
  }
  xhr.send(result);
}

//인도네시아 심충전 요청후 결과값 받는다.
function recv_Indonesia(dictdata) {
  // INNI|RESULT|SUCCESS|PHIL0000|510108042298969|90382591|085280298969|4082378|
  var result = dictdata['data3'];
  var simbank_name = dictdata['data4'];
  var imsi = dictdata['data5'];
  var msisdn = dictdata['data7'];
  var balacne = dictdata['data8'];
  var now = Date.now()
  if (result == "SUCCESS") {
    var msg = "MP|CHARGE|" + 0 + "|" + imsi + "|" + balacne + "|";
    var dbmsg = "DB|CHARGE|" + 0 + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + balacne + "|" + now + "|";
    console.log(msg)
    console.log(dbmsg)
    addon_master.send_data(msg);
    addon_db.send_data(dbmsg);
  }
  else {
    var dbmsg = "DB|CHARGE|" + 1 + "|" + simbank_name + "|" + imsi + "|" + msisdn + "|" + now + "|6|";
    addon_db.send_data(dbmsg);
    console.log(dbmsg)
  }


}

function Callback() {
  // https://web.everytt.com/inniTT/response.php
  var url = "https:web.everytt.com/inniTT/response.php"
  const req = https.get(url, (res) => {
    let body = [];

    res.on('data', (d) => {
      body.push(chunk);
    });

    res.on('end', () => {
      body = Buffer.concat(body).toString();
      console.log(body)

    });
    res.end();
  }).on('error', (e) => {
    console.error(e);
  });

}
