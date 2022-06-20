<?php

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "orbit";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT * FROM ballstatistics";

$res = mysqli_query($conn,$sql);

$result = array();

while($row = mysqli_fetch_array($res)){
    array_push($result,
        array(	'ID'=>$row[0],
        		'Ball_ID'=>$row[1],
        		'Reader_ID'=>$row[2],
        		'Time'=>$row[3]));
}

echo json_encode(array('result'=>$result));
?>