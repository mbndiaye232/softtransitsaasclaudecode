<?xml version="1.0" encoding="UTF-8" ?> 
<html xsl:version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<body bgcolor="FFFFD9">
<table border="0" bgcolor="0066CC" width="100%">
<tr>
<td><font face="Tahoma" color="FFFFD9" size="+2">TABLE_CONTENU</font></td>
</tr>
</table>
<p/>
<center>
<table border="1" bordercolor="FFFFD9" cellpadding="3">
<tr>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>N° Enr.</b></font></td>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>IDRubriques</b></font></td>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>CodeRubrique</b></font></td>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>libelleRubrique</b></font></td>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>AFacturer</b></font></td>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>NumeroCompte</b></font></td>
<td bgcolor="A0A0A0"><font face="Tahoma"><b>Observations</b></font></td>
</tr>
<xsl:for-each select="WINDEV_TABLE/TABLE_CONTENU">
  <tr>
<td bgcolor="C9E3ED"><font face="Tahoma" size="-1"><xsl:value-of select="N__Enr." /></font></td>
<td bgcolor="EFEFEF"><font face="Tahoma" size="-1"><xsl:value-of select="IDRubriques" /></font></td>
<td bgcolor="EFEFEF"><font face="Tahoma" size="-1"><xsl:value-of select="CodeRubrique" /></font></td>
<td bgcolor="EFEFEF"><font face="Tahoma" size="-1"><xsl:value-of select="libelleRubrique" /></font></td>
<td bgcolor="EFEFEF"><font face="Tahoma" size="-1"><xsl:value-of select="AFacturer" /></font></td>
<td bgcolor="EFEFEF"><font face="Tahoma" size="-1"><xsl:value-of select="NumeroCompte" /></font></td>
<td bgcolor="EFEFEF"><font face="Tahoma" size="-1"><xsl:value-of select="Observations" /></font></td>
  </tr>
</xsl:for-each>
</table>
</center>
</body>
</html>
