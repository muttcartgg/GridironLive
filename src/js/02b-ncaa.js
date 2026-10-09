/* =========================================================
   02b · NCAA Division I: every FBS and FCS program (2026 alignment)
   Format per school: School|Mascot|ABBR|primary|secondary|strength
   Strength (1.0–5.0) reflects recent real results and sets roster quality and prestige.
   Badges use text abbreviations, not official logos. Edit anything with a team pack.
   ========================================================= */
const NCAA=[
 {name:'SEC',div:'FBS',cg:9,ccg:true,t:`Alabama|Crimson Tide|ALA|#9E1B32|#FFFFFF|4.5
Arkansas|Razorbacks|ARK|#9D2235|#FFFFFF|2.9
Auburn|Tigers|AUB|#0C2340|#E87722|3.3
Florida|Gators|UF|#0021A5|#FA4616|3.3
Georgia|Bulldogs|UGA|#BA0C2F|#000000|4.6
Kentucky|Wildcats|UK|#0033A0|#FFFFFF|2.9
LSU|Tigers|LSU|#461D7C|#FDD023|3.8
Mississippi State|Bulldogs|MSST|#660000|#FFFFFF|2.8
Missouri|Tigers|MIZ|#F1B82D|#000000|3.7
Oklahoma|Sooners|OU|#841617|#FDF9D8|4.2
Ole Miss|Rebels|MISS|#CE1126|#14213D|4.4
South Carolina|Gamecocks|SC|#73000A|#000000|3.3
Tennessee|Volunteers|TENN|#FF8200|#FFFFFF|4.0
Texas|Longhorns|TEX|#BF5700|#FFFFFF|4.4
Texas A&M|Aggies|TAMU|#500000|#FFFFFF|4.2
Vanderbilt|Commodores|VAN|#000000|#CFAE70|3.8`},
 {name:'Big Ten',div:'FBS',cg:9,ccg:true,t:`Illinois|Fighting Illini|ILL|#13294B|#E84A27|3.7
Indiana|Hoosiers|IU|#990000|#EEEDEB|4.8
Iowa|Hawkeyes|IOWA|#000000|#FFCD00|3.7
Maryland|Terrapins|MD|#E03A3E|#FFD520|2.9
Michigan|Wolverines|MICH|#00274C|#FFCB05|4.1
Michigan State|Spartans|MSU|#18453B|#FFFFFF|2.8
Minnesota|Golden Gophers|MINN|#7A0019|#FFCC33|3.2
Nebraska|Cornhuskers|NEB|#E41C38|#FFFFFF|3.3
Northwestern|Wildcats|NW|#4E2A84|#FFFFFF|2.9
Ohio State|Buckeyes|OSU|#BB0000|#666666|4.8
Oregon|Ducks|ORE|#154733|#FEE123|4.6
Penn State|Nittany Lions|PSU|#041E42|#FFFFFF|3.8
Purdue|Boilermakers|PUR|#000000|#CFB991|2.4
Rutgers|Scarlet Knights|RUTG|#CC0033|#000000|2.9
UCLA|Bruins|UCLA|#2D68C4|#F2A900|2.6
USC|Trojans|USC|#990000|#FFC72C|4.0
Washington|Huskies|UW|#4B2E83|#B7A57A|3.8
Wisconsin|Badgers|WIS|#C5050C|#FFFFFF|2.9`},
 {name:'Big 12',div:'FBS',cg:9,ccg:true,t:`Arizona|Wildcats|ARIZ|#CC0033|#003366|3.4
Arizona State|Sun Devils|ASU|#8C1D40|#FFC627|3.7
Baylor|Bears|BAY|#154734|#FFB81C|3.3
BYU|Cougars|BYU|#002E5D|#FFFFFF|4.1
Cincinnati|Bearcats|CIN|#E00122|#000000|3.4
Colorado|Buffaloes|COLO|#000000|#CFB87C|3.1
Houston|Cougars|HOU|#C8102E|#FFFFFF|3.5
Iowa State|Cyclones|ISU|#C8102E|#F1BE48|3.4
Kansas|Jayhawks|KU|#0051BA|#E8000D|3.1
Kansas State|Wildcats|KSU|#512888|#FFFFFF|3.3
Oklahoma State|Cowboys|OKST|#FF7300|#000000|2.5
TCU|Horned Frogs|TCU|#4D1979|#FFFFFF|3.4
Texas Tech|Red Raiders|TTU|#CC0000|#000000|4.4
UCF|Knights|UCF|#000000|#BA9B37|3.0
Utah|Utes|UTAH|#CC0000|#FFFFFF|4.0
West Virginia|Mountaineers|WVU|#002855|#EAAA00|2.9`},
 {name:'ACC',div:'FBS',cg:8,ccg:true,t:`Boston College|Eagles|BC|#98002E|#BC9B6A|2.8
California|Golden Bears|CAL|#003262|#FDB515|3.0
Clemson|Tigers|CLEM|#F56600|#522D80|3.7
Duke|Blue Devils|DUKE|#003087|#FFFFFF|3.6
Florida State|Seminoles|FSU|#782F40|#CEB888|3.2
Georgia Tech|Yellow Jackets|GT|#B3A369|#003057|3.6
Louisville|Cardinals|LOU|#AD0000|#000000|3.5
Miami|Hurricanes|MIA|#F47321|#005030|4.5
North Carolina|Tar Heels|UNC|#7BAFD4|#13294B|2.6
NC State|Wolfpack|NCST|#CC0000|#000000|3.0
Pittsburgh|Panthers|PITT|#003594|#FFB81C|3.3
SMU|Mustangs|SMU|#C8102E|#0033A0|3.6
Stanford|Cardinal|STAN|#8C1515|#FFFFFF|2.5
Syracuse|Orange|SYR|#F76900|#000E54|2.7
Virginia|Cavaliers|UVA|#232D4B|#F84C1E|3.6
Virginia Tech|Hokies|VT|#630031|#CF4420|2.7
Wake Forest|Demon Deacons|WAKE|#000000|#9E7E38|2.9`},
 {name:'American',div:'FBS',cg:8,ccg:true,t:`Army|Black Knights|ARMY|#000000|#D4BF91|3.0
Charlotte|49ers|CLT|#005035|#A49665|1.9
East Carolina|Pirates|ECU|#592A8A|#FDC82F|2.8
Florida Atlantic|Owls|FAU|#003366|#CC0000|2.2
Memphis|Tigers|MEM|#003087|#898D8D|3.1
Navy|Midshipmen|NAVY|#00205B|#C5B783|3.2
North Texas|Mean Green|UNT|#00853E|#FFFFFF|3.4
Rice|Owls|RICE|#00205B|#C1C6C8|2.3
South Florida|Bulls|USF|#006747|#CFC493|3.1
Temple|Owls|TEM|#9D2235|#FFFFFF|2.2
Tulane|Green Wave|TUL|#006747|#418FDE|3.6
Tulsa|Golden Hurricane|TLSA|#002D72|#C8102E|2.1
UAB|Blazers|UAB|#1E6B52|#F4C300|2.2
UTSA|Roadrunners|UTSA|#0C2340|#F15A22|2.8`},
 {name:'Sun Belt',div:'FBS',cg:8,ccg:true,t:`Appalachian State|Mountaineers|APP|#000000|#FFCC00|2.6
Arkansas State|Red Wolves|ARST|#CC092F|#000000|2.5
Coastal Carolina|Chanticleers|CCU|#006F71|#A27752|2.4
Georgia Southern|Eagles|GASO|#011E41|#87714D|2.6
Georgia State|Panthers|GAST|#0039A6|#FFFFFF|1.9
James Madison|Dukes|JMU|#450084|#CBB677|3.5
Louisiana|Ragin' Cajuns|ULL|#CE181E|#FFFFFF|2.5
Louisiana-Monroe|Warhawks|ULM|#800029|#BD955A|1.9
Louisiana Tech|Bulldogs|LT|#002F8B|#E31B23|2.5
Marshall|Thundering Herd|MRSH|#00B140|#FFFFFF|2.5
Old Dominion|Monarchs|ODU|#003057|#7C878E|2.8
South Alabama|Jaguars|USA|#00205B|#BF0D3E|2.4
Southern Miss|Golden Eagles|USM|#000000|#FFAB00|2.5
Troy|Trojans|TROY|#8A2432|#B3B5B8|2.6`},
 {name:'Pac-12',div:'FBS',cg:7,ccg:true,t:`Boise State|Broncos|BOIS|#0033A0|#D64309|3.6
Colorado State|Rams|CSU|#1E4D2B|#C8C372|2.3
Fresno State|Bulldogs|FRES|#DB0032|#002E6D|2.8
Oregon State|Beavers|ORST|#DC4405|#000000|2.3
San Diego State|Aztecs|SDSU|#A6192E|#000000|2.9
Texas State|Bobcats|TXST|#501214|#8D734A|2.8
Utah State|Aggies|USU|#0F2439|#A2AAAD|2.5
Washington State|Cougars|WSU|#981E32|#5E6A71|2.6`},
 {name:'Mountain West',div:'FBS',cg:8,ccg:true,t:`Air Force|Falcons|AF|#003087|#8A8D8F|2.3
Hawaii|Rainbow Warriors|HAW|#024731|#FFFFFF|2.6
Nevada|Wolf Pack|NEV|#003366|#807F84|1.9
New Mexico|Lobos|UNM|#BA0C2F|#A7A8AA|2.7
San Jose State|Spartans|SJSU|#0055A2|#E5A823|2.4
UNLV|Rebels|UNLV|#CF0A2C|#666666|3.1
Wyoming|Cowboys|WYO|#492F24|#FFC425|2.3
UTEP|Miners|UTEP|#041E42|#FF8200|1.9
Northern Illinois|Huskies|NIU|#BA0C2F|#000000|2.5
North Dakota State|Bison|NDSU|#0A5640|#FFC82E|3.2`},
 {name:'Conference USA',div:'FBS',cg:8,ccg:true,t:`Delaware|Fightin' Blue Hens|DEL|#00539F|#FFD200|2.2
FIU|Panthers|FIU|#081E3F|#B6862C|2.2
Jacksonville State|Gamecocks|JVST|#CC0000|#000000|2.6
Kennesaw State|Owls|KENN|#FDBB30|#000000|2.4
Liberty|Flames|LIB|#0A254E|#C41230|2.6
Middle Tennessee|Blue Raiders|MTSU|#0066CC|#FFFFFF|1.9
Missouri State|Bears|MOST|#5E0009|#FFFFFF|2.2
New Mexico State|Aggies|NMSU|#8C0B42|#FFFFFF|1.9
Sam Houston|Bearkats|SHSU|#F76800|#FFFFFF|1.9
Western Kentucky|Hilltoppers|WKU|#C60C30|#FFFFFF|2.6`},
 {name:'MAC',div:'FBS',cg:8,ccg:true,t:`Akron|Zips|AKR|#041E42|#A89968|1.6
Ball State|Cardinals|BALL|#BA0C2F|#FFFFFF|1.8
Bowling Green|Falcons|BGSU|#FE5000|#4F2C1D|2.1
Buffalo|Bulls|BUFF|#005BBB|#FFFFFF|2.3
Central Michigan|Chippewas|CMU|#6A0032|#FFC82E|2.3
Eastern Michigan|Eagles|EMU|#006633|#FFFFFF|1.9
Kent State|Golden Flashes|KENT|#002664|#EAAB00|1.7
Miami (OH)|RedHawks|M-OH|#C3142D|#FFFFFF|2.6
Ohio|Bobcats|OHIO|#00694E|#FFFFFF|2.6
Sacramento State|Hornets|SAC|#043927|#C4B581|2.3
Toledo|Rockets|TOL|#15397F|#FFDA00|2.7
UMass|Minutemen|MASS|#881C1C|#FFFFFF|1.6
Western Michigan|Broncos|WMU|#6C4023|#B5A167|2.6`},
 {name:'FBS Independents',div:'FBS',cg:0,ind:true,t:`Notre Dame|Fighting Irish|ND|#0C2340|#C99700|4.5
UConn|Huskies|UCON|#000E2F|#FFFFFF|2.6`},
 {name:'Big Sky',div:'FCS',cg:8,auto:true,t:`Cal Poly|Mustangs|CP|#154734|#BD8B13|1.7
Eastern Washington|Eagles|EWU|#A10022|#FFFFFF|2.1
Idaho|Vandals|IDHO|#B3A369|#000000|2.5
Idaho State|Bengals|IDST|#F47920|#000000|1.9
Montana|Grizzlies|MONT|#70003C|#999999|2.9
Montana State|Bobcats|MTST|#003875|#B9975B|3.2
Northern Arizona|Lumberjacks|NAU|#003466|#FFD200|2.2
Northern Colorado|Bears|UNCO|#013C65|#F6B000|1.5
Portland State|Vikings|PRST|#154734|#FFFFFF|1.6
UC Davis|Aggies|UCD|#022851|#FFBF00|2.7
Weber State|Wildcats|WEB|#492365|#FFFFFF|1.9
Southern Utah|Thunderbirds|SUU|#CC0000|#FFFFFF|1.8
Utah Tech|Trailblazers|UTU|#BA1C21|#003058|1.5`},
 {name:'CAA',div:'FCS',cg:8,auto:true,t:`Albany|Great Danes|ALB|#461660|#EEB211|2.0
Bryant|Bulldogs|BRY|#000000|#C1A87D|1.7
Campbell|Fighting Camels|CAMP|#F58025|#000000|1.7
Elon|Phoenix|ELON|#73000A|#B59A57|2.0
Hampton|Pirates|HAMP|#0067AC|#FFFFFF|1.6
Maine|Black Bears|ME|#003263|#B0D7FF|1.9
Monmouth|Hawks|MONM|#002245|#FFFFFF|2.0
New Hampshire|Wildcats|UNH|#003591|#FFFFFF|2.4
North Carolina A&T|Aggies|NCAT|#004684|#FDB927|1.5
Rhode Island|Rams|URI|#68ABE8|#002147|2.5
Stony Brook|Seawolves|STBK|#990000|#16243E|2.1
Towson|Tigers|TOW|#FFBB00|#000000|2.2
Sacred Heart|Pioneers|SHU|#CE1141|#000000|1.6`},
 {name:'Patriot',div:'FCS',cg:7,auto:true,t:`Bucknell|Bison|BUCK|#E87722|#003865|1.5
Colgate|Raiders|COLG|#821019|#FFFFFF|1.8
Fordham|Rams|FOR|#860038|#FFFFFF|1.7
Georgetown|Hoyas|GTWN|#041E42|#8D817B|1.5
Holy Cross|Crusaders|HC|#602D89|#FFFFFF|2.1
Lafayette|Leopards|LAF|#98002E|#FFFFFF|2.2
Lehigh|Mountain Hawks|LEH|#653819|#FFFFFF|2.6
Richmond|Spiders|RICH|#990000|#000066|2.2
Villanova|Wildcats|NOVA|#00205B|#13B5EA|2.7
William & Mary|Tribe|W&M|#115740|#B9975B|2.2`},
 {name:'Ivy League',div:'FCS',cg:7,auto:true,t:`Brown|Bears|BRWN|#4E3629|#C00404|1.6
Columbia|Lions|CLMB|#B9D9EB|#1D4F91|1.6
Cornell|Big Red|COR|#B31B1B|#FFFFFF|1.6
Dartmouth|Big Green|DART|#00693E|#FFFFFF|2.1
Harvard|Crimson|HARV|#A51C30|#000000|2.5
Penn|Quakers|PENN|#011F5B|#990000|1.8
Princeton|Tigers|PRIN|#E77500|#000000|1.8
Yale|Bulldogs|YALE|#00356B|#FFFFFF|2.3`},
 {name:'Missouri Valley',div:'FCS',cg:8,auto:true,t:`Illinois State|Redbirds|ILST|#CE1126|#FFFFFF|2.8
Indiana State|Sycamores|INST|#00669A|#FFFFFF|1.5
Murray State|Racers|MUR|#002144|#ECAC00|1.4
North Dakota|Fighting Hawks|UND|#009A44|#000000|2.6
Northern Iowa|Panthers|UNI|#4B116F|#FFCC00|2.3
South Dakota|Coyotes|USD|#CD1241|#FFFFFF|2.6
South Dakota State|Jackrabbits|SDST|#0033A0|#FFD100|3.0
Southern Illinois|Salukis|SIU|#720000|#FFFFFF|2.4
Youngstown State|Penguins|YSU|#C8102E|#FFFFFF|2.2`},
 {name:'Southern',div:'FCS',cg:8,auto:true,t:`Chattanooga|Mocs|UTC|#00386B|#E0AA0F|2.1
East Tennessee State|Buccaneers|ETSU|#041E42|#FFC72C|2.1
Furman|Paladins|FUR|#582C83|#FFFFFF|1.9
Mercer|Bears|MER|#F76800|#000000|2.7
Samford|Bulldogs|SAM|#002F6C|#C8102E|1.8
The Citadel|Bulldogs|CIT|#3975B7|#FFFFFF|1.5
VMI|Keydets|VMI|#AE122A|#FFD619|1.5
Western Carolina|Catamounts|WCU|#592C88|#C1A875|2.1
Wofford|Terriers|WOF|#886E4C|#000000|1.6
Tennessee Tech|Golden Eagles|TNTC|#4F2984|#FFDD00|2.5`},
 {name:'Southland',div:'FCS',cg:8,auto:true,t:`East Texas A&M|Lions|ETAM|#002856|#FFC333|1.4
Houston Christian|Huskies|HCU|#00539B|#F37021|1.5
Incarnate Word|Cardinals|UIW|#CB333B|#000000|2.3
Lamar|Cardinals|LAM|#E31837|#FFFFFF|2.0
McNeese|Cowboys|MCN|#005CA9|#FFD204|1.6
Nicholls|Colonels|NICH|#C41230|#A7A8AA|1.8
Northwestern State|Demons|NWST|#492F92|#F58025|1.4
Southeastern Louisiana|Lions|SELA|#006341|#EAAA00|2.1
Stephen F. Austin|Lumberjacks|SFA|#5F259F|#FFFFFF|2.1
UTRGV|Vaqueros|RGV|#F05023|#646469|2.0`},
 {name:'Ohio Valley',div:'FCS',cg:7,auto:true,t:`Charleston Southern|Buccaneers|CHSO|#002855|#A89968|1.4
Eastern Illinois|Panthers|EIU|#004B83|#A7A8AA|1.6
Gardner-Webb|Runnin' Bulldogs|GWEB|#BB0000|#000000|1.6
Lindenwood|Lions|LIN|#000000|#B5A36A|1.6
Southeast Missouri State|Redhawks|SEMO|#C8102E|#000000|2.0
Tennessee State|Tigers|TNST|#00539F|#FFFFFF|1.8
UT Martin|Skyhawks|UTM|#0E1C5B|#F79728|1.9
Western Illinois|Leathernecks|WIU|#663399|#FFCC00|1.3`},
 {name:'United Athletic',div:'FCS',cg:7,auto:true,t:`Abilene Christian|Wildcats|ACU|#4F2170|#FFFFFF|2.5
Austin Peay|Governors|APSU|#C41E3A|#000000|2.0
Central Arkansas|Bears|UCA|#4F2D7F|#A7A9AC|2.0
Eastern Kentucky|Colonels|EKU|#861F41|#FFFFFF|1.9
North Alabama|Lions|UNA|#46166B|#DB9F11|1.6
Tarleton State|Texans|TAR|#4F2D7F|#FFFFFF|2.7
West Florida|Argonauts|UWF|#004C97|#8DC8E8|1.9
West Georgia|Wolves|UWG|#0656A5|#E21B3C|1.7`},
 {name:'Pioneer',div:'FCS',cg:8,auto:true,t:`Butler|Bulldogs|BUT|#13294B|#FFFFFF|1.4
Davidson|Wildcats|DAV|#AC1A2F|#000000|1.4
Dayton|Flyers|DAY|#CE1141|#004B8D|1.6
Drake|Bulldogs|DRKE|#004477|#FFFFFF|1.8
Marist|Red Foxes|MRST|#C8102E|#FFFFFF|1.3
Morehead State|Eagles|MORE|#005EB8|#FFC72C|1.4
Presbyterian|Blue Hose|PRES|#0060A9|#9D2235|1.4
St. Thomas|Tommies|STMN|#510C76|#FFFFFF|1.6
San Diego|Toreros|SDU|#003B70|#75BEE9|1.6
Stetson|Hatters|STET|#006747|#FFFFFF|1.4
Valparaiso|Beacons|VAL|#613318|#FFCC00|1.3`},
 {name:'Northeast',div:'FCS',cg:7,auto:true,t:`Central Connecticut|Blue Devils|CCSU|#1B49A2|#FFFFFF|1.5
Duquesne|Dukes|DUQ|#041E42|#BA0C2F|1.7
LIU|Sharks|LIU|#69B3E7|#FFC72C|1.3
Mercyhurst|Lakers|MERC|#00543C|#13294B|1.2
New Haven|Chargers|UNHV|#002D72|#FFC72C|1.6
Robert Morris|Colonials|RMU|#14234B|#A6192E|1.5
Stonehill|Skyhawks|STON|#2F2F6E|#FFFFFF|1.3
Wagner|Seahawks|WAG|#00483A|#FFFFFF|1.3`},
 {name:'MEAC',div:'FCS',cg:5,celebration:true,t:`Delaware State|Hornets|DSU|#C8102E|#00B5E2|1.3
Howard|Bison|HOW|#003A63|#E51937|1.7
Morgan State|Bears|MORG|#F47937|#003DA5|1.5
Norfolk State|Spartans|NORF|#007A53|#F3D03E|1.4
North Carolina Central|Eagles|NCCU|#880023|#A2AAAD|1.9
South Carolina State|Bulldogs|SCST|#841C2C|#00205B|1.9`},
 {name:'SWAC',div:'FCS',cg:8,ccg:true,celebration:true,t:`Alabama A&M|Bulldogs|AAMU|#660000|#FFFFFF|1.5
Alabama State|Hornets|ALST|#000000|#C99700|1.7
Alcorn State|Braves|ALCN|#46166B|#E9A713|1.6
Arkansas-Pine Bluff|Golden Lions|UAPB|#000000|#E3A81D|1.2
Bethune-Cookman|Wildcats|BCU|#6F263D|#F2A900|1.5
Florida A&M|Rattlers|FAMU|#F47920|#00843D|1.8
Grambling State|Tigers|GRAM|#000000|#EAAA00|1.6
Jackson State|Tigers|JKST|#002147|#C8102E|2.0
Mississippi Valley State|Delta Devils|MVSU|#00703C|#E31837|1.1
Prairie View A&M|Panthers|PV|#4F2D7F|#FFC72C|1.7
Southern|Jaguars|SOU|#0067AC|#FDB913|1.7
Texas Southern|Tigers|TXSO|#5F0C0C|#9EA2A2|1.5`},
 {name:'FCS Independents',div:'FCS',cg:0,ind:true,t:`Chicago State|Cougars|CHST|#006A4E|#FFFFFF|1.0`},
];
/* Real rivalries (each school has at most one designated rival; the game is played in Rivalry Week) */
const NCAA_RIVALS=[['ALA','AUB','Iron Bowl'],['OSU','MICH','The Game'],['TEX','TAMU','Lone Star Showdown'],['MISS','MSST','Egg Bowl'],['LSU','ARK','Golden Boot'],['TENN','VAN','Tennessee–Vanderbilt'],['UF','FSU','Sunshine Showdown'],['UGA','GT','Clean, Old-Fashioned Hate'],['SC','CLEM','Palmetto Bowl'],['UK','LOU',"Governor's Cup"],['ND','USC','Jeweled Shillelagh'],['MINN','WIS',"Paul Bunyan's Axe"],['IOWA','ISU','Cy-Hawk Trophy'],['IU','PUR','Old Oaken Bucket'],['ILL','NW','Land of Lincoln Trophy'],['MSU','PSU','Land Grant Trophy'],['MD','RUTG','Maryland–Rutgers'],['ORE','ORST','Oregon–Oregon State'],['UW','WSU','Apple Cup'],['STAN','CAL','The Big Game'],['UNC','NCST','UNC–NC State'],['UVA','VT','Commonwealth Clash'],['PITT','WVU','Backyard Brawl'],['BC','SYR','BC–Syracuse'],['KU','KSU','Sunflower Showdown'],['UTAH','BYU','Holy War'],['NEB','COLO','Nebraska–Colorado'],['ARIZ','ASU','Territorial Cup'],['BAY','TCU','Revivalry'],['HOU','RICE','Bayou Bucket'],['USF','UCF','War on I-4'],['ARMY','NAVY','Army–Navy Game'],['CSU','WYO','Border War'],['FAU','FIU','Shula Bowl'],['UTSA','TXST','I-35 Rivalry'],['APP','GASO','Deeper Than Hate'],['TROY','USA','Battle for the Belt'],['ODU','JMU','Royal Rivalry'],['ULL','ULM','Battle on the Bayou'],['LT','USM','Rivalry in Dixie'],['NEV','UNLV','Fremont Cannon'],['UNM','NMSU','Rio Grande Rivalry'],['SJSU','FRES','Valley Trophy'],['NDSU','SDST','Dakota Marker'],['WKU','MTSU','100 Miles of Hate'],['DEL','NOVA','Battle of the Blue'],['TOL','BGSU','Battle of I-75'],['M-OH','OHIO','Battle of the Bricks'],['CMU','WMU','Victory Cannon'],['AKR','KENT','Wagon Wheel'],['DUKE','WAKE','Duke–Wake Forest'],['MIA','SMU','Miami–SMU'],['MEM','TUL','Memphis–Tulane'],['CIN','TTU','Cincinnati–Texas Tech'],['OU','MIZ','Tiger–Sooner'],['MONT','MTST','Brawl of the Wild'],['HARV','YALE','The Game (Ivy)'],['LEH','LAF','The Rivalry'],['GRAM','SOU','Bayou Classic'],['JKST','ALCN','Soul Bowl'],['FAMU','BCU','Florida Classic'],['AAMU','ALST','Magic City Classic'],['PV','TXSO','Labor Day Classic'],['NCAT','NCCU','Aggie–Eagle Classic'],['SFA','NWST','Chief Caddo'],['NICH','SELA','River Bell Classic'],['UND','USD','North Dakota–South Dakota'],['CIT','VMI','Silver Shako'],['UCD','SAC','Causeway Classic'],['RICH','W&M','Capital Cup'],['EWU','IDHO','Eastern Washington–Idaho'],['UTC','ETSU','Mocs–Bucs'],['FUR','WOF','Furman–Wofford'],['HOW','MORG','Howard–Morgan State']];
function genNCAALeague(name){
  const teams=[],confs=[];let id=0;
  NCAA.forEach((c,ci)=>{confs.push({name:c.name,div:c.div,cg:c.cg,ccg:!!c.ccg,ind:!!c.ind,auto:c.div==='FCS'?!!c.auto:true,celebration:!!c.celebration});
    for(const line of c.t.split('\n')){const [school,mascot,abbr,c1,c2,r]=line.split('|');const q=parseFloat(r);const prestige=clamp(Math.round(q),1,5);
      teams.push(genTeam(id++,school,mascot,c1,prestige,ci,{exact:true,abbr,c2,div:c.div,q,stadium:school+' Stadium'}))}});
  const L=baseLeague(name,teams,confs);L.kind='ncaa';
  const by={};for(const t of teams)by[t.abbr]=t;
  for(const [a,b,tr] of NCAA_RIVALS){const x=by[a],y=by[b];if(x&&y&&x.rival==null&&y.rival==null)setRival(x,y,tr)}
  finishLeague(L);applyNotable(L);return L;
}
/* well-known 2026 players placed on their real teams (names only; ratings are game estimates and every roster is editable) */
const NOTABLE=[['ALA','Keelon','Russell','QB',2,{thr:5,acc:4,spd:4,end:4}],['ALA','Ryan','Williams','WR',3,{spd:5,cat:5,str:3,end:4}],
  ['OSU','Julian','Sayin','QB',2,{thr:4,acc:5,spd:3,end:4}],['OSU','Jeremiah','Smith','WR',3,{spd:5,cat:5,str:5,end:5}],
  ['MICH','Bryce','Underwood','QB',2,{thr:5,acc:4,spd:4,end:4}],['UGA','Gunner','Stockton','QB',4,{thr:4,acc:4,spd:4,end:5}],
  ['TEX','Arch','Manning','QB',4,{thr:5,acc:4,spd:4,end:4}],['ND','CJ','Carr','QB',2,{thr:4,acc:4,spd:3,end:4}],
  ['MIA','Malachi','Toney','WR',2,{spd:5,cat:5,str:3,end:4}],['TAMU','Marcel','Reed','QB',3,{thr:4,acc:4,spd:5,end:4}],
  ['COLO','Julian','Lewis','QB',2,{thr:4,acc:4,spd:3,end:4}]];
function applyNotable(L){
  const by={};for(const t of L.teams)by[t.abbr]=t;
  for(const [ab,first,last,pos,yr,at] of NOTABLE){const t=by[ab];if(!t)continue;const p=t.roster.filter(x=>x.pos===pos).sort((a,b)=>ovr(b)-ovr(a))[0];if(!p)continue;
    Object.assign(p,{first,last,yr,real:true});for(const k in at)p[k]=Math.max(p[k],at[k]);p.fine=2}
  if(typeof invalidate==='function')invalidate();
}
