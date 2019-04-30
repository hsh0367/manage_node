'use strict';

const User_Promo_Schema = {
  name: 'USER_PROMO',
  properties: {
    promo_name: { type: 'string', default: '' }, //등록한 프로모이름
    net: { type: 'int', default: 0 }, //같은 통신사
    other: { type: 'int', default: 0 }, //타 통신사
    expire_date: { type: 'int', default: 0 } //프로모 사용기간
  }
};

const Sim_Imsi_Schema = {
  name: 'SIM',
  // primaryKey: 'imsi',
  properties: {
    imsi:  {type :'string',default: ''},
    sim_pid: { type: 'int', default: 0 }, //tb_si2m_list  pid
    user_pid: { type: 'int', default: 0 }, //심 사용자 의 tb_user pid
    user_id: { type: 'string', default: '' }, //심 사용자의 아이디
    user_serial: { type: 'string', default: '' }, //심 사용자의 시리얼
    lur_date: { type: 'int', default: 0 }, //마지막으로 lur 한 시간
    mcc: { type: 'string', default: '' }, //심의 mcc 국가 코드
    mnc: { type: 'string', default: '' }, //심의 mnc 이통사 코드
    lac: { type: 'string', default: '' }, //tmsi 갱신되었을 때 lac 심인증정보
    cell_id: { type: 'string', default: '' }, //tmsi 갱신되었을 때 cell id
    bsic: { type: 'string', default: '' }, //tmsi 갱신되었을 때 bsic
    arfcn: { type: 'int', default: 0 }, //tmsi 갱신되었을 때 arfcn
    tmsi: { type: 'string', default: '' },
    kc: { type: 'string', default: '' }, //tmsi 갱신되었을 때 kc
    cksn: { type: 'int', default: 0 }, //tmsi 갱신되었을 때 cksn
    msisdn: { type: 'string', default: '' }, //심의 전화번호
    sim_id: { type: 'string', default: '' }, //심뱅크 ID
    sim_serial_no: { type: 'int', default: 0 }, //심뱅크 심 위치
    simbank_name: { type: 'string', default: '' }, //심뱅크 이름
    connector: { type: 'string', default: '' }, //마지막으로 사용한 c118
    imei: { type: 'string', default: '' }, //getData할때  생성한 imei 임의 단말기 고유값
    mobileType: { type: 'int', default: 0 }, //이동통신사 구분 숫자로 구분 들어올때 스트링으로 들어와서 변환해서 사용해야한다.
    doing_promo: { type: 'int', default: 0 }, //1이면 프로모  현재 등록중
    sim_balance: { type: 'int', default: 0 }, //심의 잔액
    out_call_time: { type: 'int', default: 0 }, //무료 수신 분수
    expire_match_date: { type: 'int', default: 0 }, //사용자 심 사용 만료일
    sms_promo: { type: 'list', objectType:'USER_PROMO' }, //USER_PROMO 문자 프로모 정보
    call_promo: { type: 'list', objectType: 'USER_PROMO' }, //전화 프로모 정보
    sim_promo: { type: 'list', objectType: 'USER_PROMO'}, // 심 자체 프로모 정보
    lur_fail_cnt: { type: 'int', default: 0 }, //lur연속 실패횟수
    send_sms_cnt: { type: 'int', default: 0 }, //발신할때 모바일에 보내는 ,reference number
    sim_state: { type: 'int', default: 0 }, //대기심  만들때 심 상태
    sim_expire_date: { type: 'int', default: 0 }, // sim_expire_date
    charging: { type: 'int', default: 0 }, // 충전중인지 플래그
    sim_type: { type: 'int', default: 0 }, //0 – 집단형, 1- 개인형

  }
};

const RateSchema = {
  name: 'RATE',
  properties: {
    id : {type : 'int', default: 0},
    call_value: { type: 'float',default: 0.0 }, //발신요금
    call_unit: { type: 'int', default: 0 }, //발신 과금 단위
    area_name: { type: 'string', default: '' }, //국가이름
    area_no : {type: 'int', default: 0 },
  }
};
const UserInfoSchema = {
  name: 'USER',
  primaryKey: 'user_pid',
  properties: {
    user_pid: { type: 'int', default: 0 }, //tb_user pid
    user_id: { type: 'string', default: '' }, //사용자 아이디
    user_pw: { type: 'string', default: '' }, // 사용자 비밀번호
    user_serial: { type: 'string', default: '' }, //사용자 시리얼 회원가입 mysql 겹치지 않게
    credit: { type: 'int', default: 0 }, // 사용자 크래딧 TOPUP
    auto_flag: { type: 'int', default: 0 }, // 심 구매 자동 연장 0 : 연장않하지 않음, 1 : 연장
    app_type: { type: 'int', default: 0 }, // 0-android, 1-ios
    call: { type: 'int', default: 0 }, // 전화 call_seq
    join_type: { type: 'int', default: 0 }, // 0-집단형, 1-개인형
    user_sim_imsi: { type: 'string', default: '' }, //사용자가 쓰는 심 IMIS
    recv_call_event_time: { type: 'int', default: 0 }, //수신콜 이벤트 expire 시간
    call_event_time: { type: 'int', default: 0 }, //발신콜 이벤트 expire 시간
    call_value: { type: 'int', default: 0 }, //발신콜 과금 금액
    call_unit: { type: 'int', default: 0 }, //발신콜 과금 단위
    recv_call_value: { type: 'int', default: 0 }, //수신콜 과금 금액
    recv_call_unit: { type: 'int', default: 0 }, //수신콜 과금 단위
    fcm_push_key: { type: 'string', default: '' },
    voip_push_key: { type: 'string', default: '' },
  }
};

const MediaSchema = {
  name: 'MEDIA',
  primaryKey: 'sock_fd',
  properties: {
    sock_fd: { type: 'int', default: 0 }, //void proxy와 통신할 소켓 fd
    state: { type: 'int', default: 0 }, //sig 서버와 연결상테 0-off/ 1-on
    isuse: { type: 'int', default: 0 }, //사용자 사용여부
    last_call_time: { type: 'int', default: 0 }, //마지막 사용시간
    rtp_port: { type: 'int', default: 0 }, //voip proxy에서 상대방과 통신할 udp port
    port: { type: 'int', default: 0 }, //voip proxy에서 사용자와 통신할 udp port
    ip: { type: 'string', default: '' }, //voip proxy ip
    drop_timer: { type: 'date' }, //통화중인 경우 available_time시간에 맞쳐서 Drop 이벤트 처리할 타이머
  }
};

const Connector_Info_Schema = {
  name: 'CONNECTORINFO',
  primaryKey: 'connector',
  properties: {
    sockfd: { type: 'int', default: 0 }, //MP 서버와 통신하는 소켓 식별자
    connector: { type: 'string', default: '' }, //모바일 아이디
    boxgroup: { type: 'int', default: 0 },
    mcc: { type: 'string', default: '' }, //셋팅한 통신사(mobile country codes)
    mnc: { type: 'string', default: '' }, //셋팅한 통신사(mobile network codes)
    LAC: { type: 'int', default: 0 }, //Location Area Code
    ARFCN: { type: 'int', default: 0 }, //absolute radio-frequency channel number
    serial_port: { type: 'int', default: 0 },
    access_cnt: { type: 'int', default: 0 },
    mm_state: { type: 'int', default: 0 }, //idle = 1
    net_status: { type: 'int', default: 0 }, //MP와 모바일 네트워크 상태 1 - 정상
    block_status: { type: 'int', default: 0 }, //심 블락 상태 1-블락된 상태
    use_state: { type: 'int', default: 0 }, //사용 여부 0-사용가능한 상태
    state: { type: 'int', default: 0 }, //모바일의 현재 상태_1
    sub_state: { type: 'int', default: 0 }, //모바일의 현재 상태_2(detail)
    last_usetime: { type: 'int', default: 0 }, //모바일에서 CS01 받은 시간
    last_recv_date: { type: 'int', default: 0 }, //MP가 모바일에 마지막 데이터를 받은 시간 (초)
    imsi: { type: 'string', default: '' },
    dbm: { type: 'int', default: 0 }, //모바일의 현재 dbm 상태
    cell_id: { type: 'int', default: 0 },
    bsic: { type: 'int', default: 0 },
    set_arfcn: { type: 'int', default: 0 },
    port_type: { type: 'int', default: 0 }, //0 - 일반 / 1 - 문자에만 사용
    is_test: { type: 'int', default: 0 }, //테스트 포트 여부 0 - 일반 / 1 - 테스트
    c118_fd_idx: { type: 'int', default: 0 },
    array_idx: { type: 'int', default: 0 },
    paging_seq: { type: 'int', default: 0 },
  }
};

exports.USER_PROMO_TEST = User_Promo_Schema;
exports.SIM_TEST = Sim_Imsi_Schema;
exports.USER_TEST = UserInfoSchema;
exports.MEDIA_TEST = MediaSchema;
exports.CONNECTORINFO_TEST = Connector_Info_Schema;
exports.RATE_TEST = RateSchema;
