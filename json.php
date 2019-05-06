<?php

echo "running php script";
// Read the JSON file
$users = file_get_contents("users.json");
$users = json_decode($users, true);

// Get and trim the input fields if necessary
$username = trim($_POST["username"]);
$password = $_POST["password"];

// Check the username
if (array_key_exists($username, $users))
    $output["error"] = "Duplicate username exists!";

// Check all fields
elseif (empty($username) || empty($password))
    $output["error"] = "Not all data has been submitted!";

// Add the user
else {
    // Add the user to the JSON object and save it
    $users[$username]["username"] = $username;
    $users[$username]["password"] = $password;
    $users[$username]["score"] = 0;

    file_put_contents("users.json", json_encode($users, JSON_PRETTY_PRINT));

    // Set up the session
    session_start();
    $_SESSION["username"] = $username;

    $output["success"] = "";
}

header("content-type: application/json");

print json_encode($output);
?>