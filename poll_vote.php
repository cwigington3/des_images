
<?php
$vote = $_REQUEST['vote'];

//get content of textfile
$filename = "poll_result.txt";
$content = file($filename);

//put content in array
$array = explode("||", $content[0]);
$Coogan = $array[0];
$Koy = $array[1];
$Sterlings = $array[2];

if ($vote == 0) {
  $Coogan = $Coogan + 1;
}
if ($vote == 1) {
    $Koy = $Koy + 1;
  }
if ($vote == 2) {
$Sterlings = $Sterlings + 1;
}
    
//insert votes to txt file
$insertvote = $Coogan."||".$Koy."||".$Sterlings;
$fp = fopen($filename,"w");
fputs($fp,$insertvote);
fclose($fp);
?>

<h2>Result:</h2>
<table>
<tr>
<td>Coogan:</td>
<td>
<img src="https://www.w3schools.com/php/poll.gif"
width='<?php echo(100*round($Coogan/($Koy+$Coogan+$Sterlings),2)); ?>'
height='20'>
<?php echo(100*round($Coogan/($Koy+$Coogan+$Sterlings),2)); ?>%
</td>
</tr>
<tr>
<td>Koy:</td>
<td>
<img src="https://www.w3schools.com/php/poll.gif"
width='<?php echo(100*round($Koy/($Koy+$Coogan+$Sterlings),2)); ?>'
height='20'>
<?php echo(100*round($Koy/($Koy+$Coogan+$Sterlings),2)); ?>%
</td>
</tr>
<tr>
<td>Sterlings:</td>
<td>
<img src="https://www.w3schools.com/php/poll.gif"
width='<?php echo(100*round($Sterlings/($Koy+$Coogan+$Sterlings),2)); ?>'
height='20'>
<?php echo(100*round($Sterlings/($Koy+$Coogan+$Sterlings),2)); ?>%
</td>
</tr>
</table> 