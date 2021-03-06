<?php
    date_default_timezone_set('Asia/Singapore');
    header('Access-Control-Allow-Origin: *');   

    $debugOn = false;  
    $logstr = "";
    $jwt_token = "";
    $json_response ="";
    $date=date_create();
    $stamp = date_timestamp_get($date); 
    $logfile  = "upload_log.log";        

    if($request = json_decode(file_get_contents("php://input"))){
        //browser request
    } 
    else{
        //mobile request
        $postdata     = $_POST;   
        $jsonString   = json_encode($postdata);  
        $request      = json_decode($jsonString);
    }  

    if($debugOn) {
        $logstr = "=================================================================\r\n";
        $logstr = $logstr."RENEW TOKEN FUNCTION - ".$stamp."\r\n";
        $logstr = $logstr."=================================================================\r\n";
        $logstr = $logstr."working directory : ".getcwd()."\r\n";      
        $logstr = $logstr."request : ".json_encode($request)."\r\n"; 
        //$logstr = $logstr."fileURL : |".$request->fileLoc."|\r\n"; 
     }


    // using ldap bind
    $clean = strtr( $request->id, ' ', '+');
    $ascii = base64_decode( $clean );
    $ldaprdn  = $ascii;

    // $logstr = $logstr."=================================================================\r\n";

    // base64 encodes the header json
    $encoded_header = base64_encode('{"alg": "HS256","typ": "JWT"}');
    
    // $logstr =  $logstr."stamp:".$stamp."\r\n"; 
    $expiry = strtotime("+30 minutes");
    $logstr =  $logstr."expiry=".$expiry."\r\n";    

    
    // base64 encodes the payload json    
    $encoded_payload = base64_encode('{"iss": "creativelab.sph.com.sg","exp":'.$expiry.',"country": "Singapore","userID":"'.$ldaprdn.'","email":"'.$ldaprdn.'@sph.com.sg"}');

    // base64 strings are concatenated to one that looks like this
    $header_payload = $encoded_header . '.' . $encoded_payload;

    //Setting the secret key
    $secret_key = 'Cr34t1v3J0bsR3qu1s1t10n';

    // Creating the signature, a hash with the s256 algorithm and the secret key. The signature is also base64 encoded.
    $signature = base64_encode(hash_hmac('sha256', $header_payload, $secret_key, true));

    // Creating the JWT token by concatenating the signature with the header and payload, that looks like this:
    $jwt_token = $header_payload . '.' . $signature;
    $logstr =  $logstr."jwt_token-".$jwt_token."\r\n";
    $json_response = $json_response.$jwt_token;
       
  

    if( $debugOn ) {  error_log($logstr, 3, $logfile); }
    echo $json_response;
?>