#include <nan.h>
#include <boost/lockfree/queue.hpp>
#include <boost/lockfree/spsc_queue.hpp>
#include <functional>
#include <utility>
#include <queue>
#include "stdio.h"
#include "stdlib.h"
#include "string.h"
#include "time.h"
#include "sys/types.h"
#include "sys/socket.h"
#include "netinet/in.h"
#include "arpa/inet.h"
#include <v8.h>
#include <pthread.h>
#include <unistd.h>
#include <string.h>
#include <signal.h>
#include <sys/time.h>
#include <stdarg.h>
/* socket  */
#define RECV_THREAD 5
#define BUF_LEN 1024


pthread_t send_thread;
pthread_t texample_thread;
pthread_t socket_recv_thread[RECV_THREAD];
int socket_array[RECV_THREAD] ;
/* socket  */
int 	socket_max_set[RECV_THREAD] ;
fd_set  tcp_active_fd_set[RECV_THREAD], tcp_read_fd_set[RECV_THREAD] ;

int server_fd;


using namespace v8;
using namespace Nan;

namespace demo {
using v8::Isolate;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Object;
using v8::String;
using v8::Value;

typedef struct msg_send_MP
{
        int timestamp;

}MSG_SEND_MP;


Callback* cbPeriodic;
//boost::lockfree::spsc_queue<std::string, boost::lockfree::capacity<1024> > cb_msg_queue;
boost::lockfree::queue<char*, boost::lockfree::capacity<1024> > cb_msg_queue;

//boost::lockfree::queue<std::string> cb_msg_queue;
//std::queue<std::string> cb_msg_queue = std::queue<std::string>();
std::queue<std::string> send_msg_queue = std::queue<std::string>();
pthread_mutex_t queue_mutex = PTHREAD_MUTEX_INITIALIZER;

pthread_mutex_t  send_queue_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t  send_queue_con_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t   send_queue_cond  = PTHREAD_COND_INITIALIZER;
int  send_que_mutex_wait_state = 0 ;
int thread_state =0 ;

pthread_mutex_t  f_mutex = PTHREAD_MUTEX_INITIALIZER;
/*write_log*/
FILE *fp = NULL;
int fp_count = 0;
int o_month=0, o_day=0, o_year=0, n_month, n_day, n_year;

char log_tmp[1024];
char _LOG[1024];
char filename[128];

char node_ip[20];
int node_port ;

int write_log(  char *write_filename, int write_fileline , char *log_string, ... )
{

	pthread_mutex_lock(&f_mutex);

	struct tm *current;
	time_t timenow;


	time(&timenow);
	current = localtime(&timenow);
    n_month = current->tm_mon+1;
    n_day = current->tm_mday;
    n_year = current->tm_year+1900;



	if( o_month != n_month || o_day != n_day || o_year != n_year  )
	{
		o_month = n_month;
		o_day  	= n_day;
		o_year	= n_year;

		if( current != NULL  )
		{
			sprintf( filename, "./log/log-%d-%d-%d.txt", o_year, o_month, o_day);
			puts( filename );
		}
	}

	va_list argList;
    va_start(argList, log_string);

	vsnprintf(log_tmp, 1024 -30 , log_string, argList);
	va_end(argList);


	//sprintf( _LOG ,"[%02d:%02d:%02d %s:%d]%s\n", current->tm_hour, current->tm_min, current->tm_sec, write_filename, write_fileline, log_tmp );
	snprintf( _LOG, 1024 ,"[%02d:%02d:%02d %s:%d]%s\n", current->tm_hour, current->tm_min, current->tm_sec, write_filename, write_fileline, log_tmp );

	fp = fopen(filename, "a");
	if(fp)
	{

		fprintf(fp, "%s", _LOG);
		fflush(fp);
		fclose(fp);

	}

	pthread_mutex_unlock(&f_mutex);

	return 1;
}

static void recordAudioCallback(int index , char *str);
void asyncmsg(uv_async_t* handle);

uv_async_t async;
uv_loop_t* loop;

int policy_sock = 0 ;
int mp_sock = 0 ;
int sms_sock = 0 ;
int call_sock = 0 ;
int tcp_push_sock = 0 ;

int tcp_port =0 ;
struct sigaction act_new;


void termination_handler(int sig)
{
	if( sig ){ ; } //do nothing.

	if ( sig == SIGINT ||  sig == SIGTERM  || sig == SIGSTOP || sig == SIGQUIT || sig == SIGSEGV  || sig == SIGKILL || sig == SIGFPE )
	{
		printf("[sighandler] %d \n", sig );

		thread_state = 0;
		pthread_mutex_destroy(&queue_mutex);
		pthread_mutex_destroy(&send_queue_mutex);
		pthread_mutex_destroy(&send_queue_con_mutex);

		pthread_cond_destroy(&send_queue_cond);

    pthread_mutex_destroy(&f_mutex);
		exit(0);
	}



}


void send_tcp_data( char *data ){

  if( data[0] == 'P'){
    send(policy_sock,data,strlen(data),0);
    printf( "send_tcp_data  %d[%s]\n" , policy_sock , data );
  }
  if( data[0] == 'C'){
    send(call_sock,data,strlen(data),0);
    printf( "send_tcp_data  %d[%s]\n" , call_sock , data );
  }
  if( data[0] == 'S'){
    send(sms_sock,data,strlen(data),0);
    printf( "send_tcp_data  %d[%s]\n" , sms_sock , data );
  }
  if( data[0] == 'T'){
    send(tcp_push_sock,data,strlen(data),0);
    printf( "send_tcp_data  %d[%s]\n" , tcp_push_sock , data );
  }
  else{
    send(mp_sock,data,strlen(data),0);
  }

  printf( "send_tcp_data  [%s]\n" , data );
}


void send_queue_push( char *data ){

  pthread_mutex_lock(&send_queue_mutex);

  send_msg_queue.push(data);
  pthread_mutex_unlock(&send_queue_mutex);


  pthread_mutex_lock(&send_queue_con_mutex);
  if( send_que_mutex_wait_state == 1 ) pthread_cond_signal(&send_queue_cond);
  pthread_mutex_unlock(&send_queue_con_mutex);

}


void recv_data(int index , char *data) {
  //printf("==> recordAudioCallback  %d\n", index);

    if( strcmp(data, "Alive_Policy") == 0 )
      policy_sock = index;
    else if(strcmp(data, "Alive_CALL") == 0 )
      call_sock = index;
    else if(strcmp(data, "Alive_SMS") == 0 )
      sms_sock = index;
    else if(strcmp(data, "Alive_TCP") == 0 )
      tcp_push_sock = index;
    else if(strcmp(data, "Alive_MP") == 0 )
      mp_sock = index;
    else  {
       recordAudioCallback( index , data) ;
    }
  //printf("==> recordAudioCallback  %d\n", index);
}

void recordAudioCallback(int index , char *data) {
  //printf("==> recordAudioCallback  %d\n", index);
    write_log(__FILE__, __LINE__, "recordAudioCallback%s \n", data );
  //  pthread_mutex_lock(&queue_mutex);
    cb_msg_queue.push(data);
  //  pthread_mutex_unlock(&queue_mutex);

  //  uv_async_send(&async);
  //printf("==> recordAudioCallback  %d\n", index);
}

void asyncmsg(uv_async_t* handle) {
  //printf("==> asyncmsg \n");
  int loop = 1 ;
  //while( loop )
  {
    int que_size = 0;
    std::string from ;
  //  pthread_mutex_lock(&queue_mutex);

    while( !cb_msg_queue.empty() ){
      que_size= 1;
    //  from =  cb_msg_queue.front() ;
      cb_msg_queue.pop(from);

  //  pthread_mutex_unlock(&queue_mutex);


    Nan::HandleScope scope;
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    //Local<Value> argv[] = { v8::String::NewFromUtf8(isolate, cb_msg_queue.front()) };

    Local<Value> argv[] = { v8::String::NewFromUtf8( isolate, from.c_str() )};


      write_log(__FILE__, __LINE__, "asyncmsg callback before%s \n", from.c_str() );
    cbPeriodic->Call(1, argv);
      write_log(__FILE__, __LINE__, "asyncmsg callback after%s \n", from.c_str() );
    }
  //  else loop =0 ;
  }
}


void* select_thread_main(void *arg)
{
	int  index  = *((int *)arg);


	struct timeval recvout;
	int ret =0 , buf_len = 0 ;
	char buf[1024];
	FD_ZERO( &tcp_active_fd_set[index]);

	printf("[tcp_select_thread_main:  %d]   \n ", index );

	while(1)
	{

		recvout.tv_sec = 0 ;
		recvout.tv_usec = 100;
		tcp_read_fd_set[index] = tcp_active_fd_set[index];


		ret =  select( socket_max_set[index] , &tcp_read_fd_set[index], NULL, NULL, &recvout);

		if( ret == 0 )	//TimeOut
		{
      uv_async_send(&async);
			continue;
		}
		else if( ret < 0 )	//Error
		{
			continue;
		}

//		for( int idx=0;   idx < socket_max_set[index]+1;    idx++ )
		for( int idx=0;   idx < socket_max_set[index];    idx++ )
		{
			/* sm (FD_ISSET���� Ȯ������ �ʰ�, ���� �����Ͱ� ������ ������ �ƴ� �ٸ� ������ �б� �õ��ϸ� ����)*/
			if( FD_ISSET(idx,    &tcp_read_fd_set[index] ))
			{
				if( ret > 0 )	//Recv
				{
					memset(buf,0, BUF_LEN);
					buf_len = recv( idx , buf, BUF_LEN-1, 0 );


					if( buf_len <=0 )
					{

					//	printf("[socket close :  %d]    \n", idx );

						FD_CLR( idx, &tcp_active_fd_set[index] );


						shutdown( idx, SHUT_RDWR );
						close(idx);


					}
					else
					{
						//paser_c118( idx  , buf  ,  buf_len , index )  ;
          //  printf("test");
            write_log(__FILE__, __LINE__, "recv_data%s \n", buf );

            recv_data( idx , buf) ;

					}
				}

			}
		}
	}


	return 0;
}

void* make_socket( void *data  )
{



    int port = 2222 ;

    if( tcp_port > 0 ) port = tcp_port;

    char buffer[BUF_LEN];

    struct sockaddr_in server_addr, client_addr;

    int client_fd;
    //server_fd, client_fd : 각 소켓 번호
    int len;
    int option = 1;



    int inti[RECV_THREAD] ;
    for( int i = 0 ; i < RECV_THREAD ; i++)
    {


      inti[i] = i;
      printf("[sock_thread_main:  %d:%d]   \n ", inti[i] , i );
      if( pthread_create(&socket_recv_thread[i], NULL, select_thread_main, (void *)&inti[i]) < 0 )
      {
        perror("Main Thread Error");
        exit(0);
      }


    }
    MAKE_C118_SOCK :

    if((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == -1)
    {// 소켓 생성
        printf("Server : Can't open stream socket\n");
        exit(0);
    }

    setsockopt( server_fd, IPPROTO_TCP, TCP_NODELAY, &option, sizeof(option));
  	setsockopt( server_fd, SOL_SOCKET, SO_REUSEADDR, &option, sizeof(option));

    memset(&server_addr, 0x00, sizeof(server_addr));
    //server_Addr 을 NULL로 초기화

    server_addr.sin_family = AF_INET;
    //server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    server_addr.sin_port = htons( port );
    //server_addr 셋팅

    if(bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) )
    {//bind() 호출
        printf("Server : Can't bind local address.\n");
        exit(0);
    }

    if(listen(server_fd, 5) < 0)
    {//소켓을 수동 대기모드로 설정
        printf("Server : Can't listening connect.\n");
        exit(0);
    }

    memset(buffer, 0x00, sizeof(buffer));
    printf("Server : wating connection request.port %d\n", port);

    len = sizeof(client_addr);


    while( 1 )
    {
        //printf("Server: while.\n");
        client_fd = accept(server_fd, (struct sockaddr *)&client_addr, (socklen_t*)&len);


  		if( client_fd >= 0 )
  		{
        int  c_idx = client_fd % RECV_THREAD ;

        if( client_fd >socket_max_set[c_idx] )
          socket_max_set[c_idx] = client_fd+1;

        FD_SET(client_fd, &tcp_active_fd_set[c_idx]) ;




  		}


        else{

            printf("Server: accept failed.\n");
        }



    }

    close(server_fd);

  //  goto MAKE_C118_SOCK;

}

void* send_thread_main( void *data  )
{
  struct timeval now;
  struct timespec ts;

  //unique_idx = 6000000 ;

  int recv_data = 0 ;

  while(thread_state)
  {
    recv_data = 0 ;
    std::string str ;//= std::string(*param1);

    gettimeofday(&now, NULL);
    ts.tv_sec = now.tv_sec + 10;
    ts.tv_nsec = now.tv_usec * 1000;

  //  write_log(__FILE__, __LINE__, "queue_thread\n");

    if( send_msg_queue.size() == 0 )
     {
       pthread_mutex_lock(&send_queue_con_mutex);
       send_que_mutex_wait_state = 1 ;
       pthread_cond_timedwait(&send_queue_cond, &send_queue_con_mutex, &ts);
       send_que_mutex_wait_state = 0 ;
       pthread_mutex_unlock(&send_queue_con_mutex);
     }

    //  memset( &data, 0, sizeof(RECV_MSG)) ;

      pthread_mutex_lock(&send_queue_mutex);
        if( !send_msg_queue.empty() )
        {
              str = send_msg_queue.front();
              send_msg_queue.pop();
              recv_data = 1;
        }
      pthread_mutex_unlock(&send_queue_mutex);






      if(recv_data){
        //write_log(__FILE__, __LINE__, "recv_data\n");
        int size = str.size() ;
        char send_data[1024] ={0};
        strcpy( send_data, str.c_str() );
        //std::vector<char> buff(size+ 1); // initializes to all 0's.
        //std::copy(str.begin(), str.end(), buff.begin());


        if( send_data[0] == 'P'){
          send(policy_sock,send_data,size,0);
           write_log(__FILE__, __LINE__, "send_tcp_data  %d[%s]\n" , policy_sock , send_data  );
        }
        else if( send_data[0] == 'C'){
            send(call_sock,send_data,strlen(send_data),0);
            printf( "send_tcp_data  %d[%s]\n" , call_sock , send_data );
          }
        else if( send_data[0] == 'S'){
            send(sms_sock,send_data,strlen(send_data),0);
            printf( "send_tcp_data  %d[%s]\n" , sms_sock , send_data );
          }
        else if( send_data[0] == 'T'){
            send(tcp_push_sock,send_data,strlen(send_data),0);
            printf( "send_tcp_data  %d[%s]\n" , tcp_push_sock , send_data );
          }
          else{
            send(mp_sock,send_data,strlen(send_data),0);
          }


         write_log(__FILE__, __LINE__, "send_tcp_data  [%s]\n" , send_data );

      }


  }

}

int main_function()
{
  act_new.sa_handler = termination_handler;
  sigemptyset( &act_new.sa_mask);


  sigaction( SIGINT, &act_new, 0);
  sigaction( SIGTERM, &act_new, 0);
  sigaction( SIGSTOP, &act_new, 0);
  sigaction( SIGQUIT, &act_new, 0);

  sigaction( SIGSEGV, &act_new, 0);
  sigaction( SIGKILL, &act_new, 0);
  sigaction( SIGFPE, &act_new, 0);
	printf("main_function \n");


  pthread_mutex_init(&queue_mutex, NULL);

  pthread_mutex_init(&send_queue_mutex, NULL);
  pthread_mutex_init(&send_queue_con_mutex, NULL);
  pthread_mutex_init(&f_mutex, NULL);
  pthread_cond_init(&send_queue_cond, NULL);



  int status =0 ;
  thread_state = 1;

  pthread_create(&texample_thread, NULL, make_socket, (void *)&status);

  pthread_create(&send_thread, NULL, send_thread_main, (void *)&status);
}



static void SetCallback(const Nan::FunctionCallbackInfo<v8::Value>& info) {

  v8::Isolate *isolate = info.GetIsolate();

  tcp_port  =   info[0]->Int32Value();

  printf("tcp_port %d \n", tcp_port);

  cbPeriodic = new Callback(info[1].As<Function>());
  loop = uv_default_loop();
  uv_async_init(loop, &async, asyncmsg);


  main_function() ;


}



void Send_data(const Nan::FunctionCallbackInfo<v8::Value>& info) {

  if (info.Length() < 1) {
    Nan::ThrowTypeError("Wrong number of arguments");
    return;
  }

  v8::String::Utf8Value param1(info[0]->ToString());
  std::string str = std::string(*param1);


//  v8::<String> str = info[0]->ToString();
  // char* bar = ToCString(str);

/*
  std::vector<char> buff(str.size() + 1); // initializes to all 0's.
  std::copy(str.begin(), str.end(), buff.begin());
  //send_tcp_data(&buff[0]);
  send_queue_push( &buff[0] );
*/

  pthread_mutex_lock(&send_queue_mutex);

  send_msg_queue.push(str);
  pthread_mutex_unlock(&send_queue_mutex);


  pthread_mutex_lock(&send_queue_con_mutex);
  if( send_que_mutex_wait_state == 1 ) pthread_cond_signal(&send_queue_cond);
  pthread_mutex_unlock(&send_queue_con_mutex);

  // send_tcp_data(bar);
//  send_tcp_data( ToCString(info[0]->ToString()) );
}


static void Init(v8::Local<v8::Object> exports, v8::Local<v8::Object> module) {
  Nan::SetMethod(exports, "setCallback", SetCallback);
  exports->Set(Nan::New("send_data").ToLocalChecked(),
              Nan::New<v8::FunctionTemplate>(Send_data)->GetFunction());

}

NODE_MODULE(addon, Init)
}
