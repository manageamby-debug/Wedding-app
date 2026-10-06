from PIL import Image, ImageDraw, ImageFont
import math
import cv2

OUT = r"C:\Users\Administrator\Desktop\Wedding-app"
W,H=1600,1000
BG=(17,17,17); HEADER=(12,12,12); PANEL=(24,24,24); PANEL2=(30,30,30); BLACK=(10,10,10)
LINE=(48,48,48); TEXT=(224,224,224); MUTED=(142,142,142); DIM=(98,98,98)
AMBER=(230,142,0); GREEN=(104,190,142); BLUE=(111,174,213); RED=(221,114,106); PURPLE=(181,147,194)

def F(n,b=False,s=False):
    p=r"C:\Windows\Fonts\segoesc.ttf" if s else (r"C:\Windows\Fonts\segoeuib.ttf" if b else r"C:\Windows\Fonts\segoeui.ttf")
    return ImageFont.truetype(p,n)
def rounded(d,box,fill,outline=None,r=13,w=1): d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=w)
def label(d,x,y,t,n=14,c=TEXT,b=False,a=None): d.text((x,y),t,font=F(n,b),fill=c,anchor=a)
def base(title,active,tagline):
    im=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(im)
    # low-contrast contour curves in backdrop
    for cx,cy,rx,ry in [(1540,30,300,210),(-30,770,280,260),(870,910,370,210)]:
        for k in range(7):
            q=.58+k*.09; d.ellipse((int(cx-rx*q),int(cy-ry*q),int(cx+rx*q),int(cy+ry*q)),outline=(25,25,25),width=1)
    d.rectangle((0,0,W,72),fill=HEADER); d.line((0,71,W,71),fill=LINE,width=1)
    label(d,32,13,"EverAfter",29,(210,210,210),False,None)
    # replace logo text with script by redrawing over normal
    d.rectangle((25,8,175,60),fill=HEADER); d.text((32,12),"EverAfter",font=F(29,s=True),fill=(210,210,210)); d.ellipse((157,34,166,43),fill=AMBER)
    label(d,210,28,"Sam & Regina's Wedding",14,(175,175,175),True)
    rounded(d,(1272,14,1434,58),(31,31,31),(62,62,62),12); d.ellipse((1289,31,1301,43),fill=AMBER); label(d,1310,27,"Matte Black",13,TEXT,True)
    rounded(d,(1448,14,1568,58),AMBER,None,12); label(d,1508,36,"+  Add guest",13,(20,20,20),True,"mm")
    # left nav
    d.rectangle((0,72,225,H),fill=(13,13,13)); d.line((224,72,224,H),fill=(40,40,40),width=1)
    label(d,26,101,"EVENT WORKSPACE",10,DIM,True)
    nav=[("Overview","⌂"),("Guests","◉"),("Invitations","✉"),("RSVPs","✓"),("Check-in","▣"),("Contributions","TSh"),("Event settings","⚙")]
    for i,(name,icon) in enumerate(nav):
        y=141+i*53
        if name==active: rounded(d,(12,y-4,212,y+37),(42,32,19),None,9); d.rectangle((12,y-4,15,y+37),fill=AMBER)
        label(d,29,y+7,name[:2].upper(),9,AMBER if name==active else MUTED,True)
        label(d,60,y+4,name,14,TEXT if name==active else MUTED,name==active)
    rounded(d,(15,885,210,963),(24,24,24),(44,44,44),12)
    d.ellipse((28,902,61,935),fill=(66,48,29)); label(d,44,919,"S",13,(245,190,105),True,"mm")
    label(d,72,899,"Samajemba",13,TEXT,True); label(d,72,922,"Organizer",11,MUTED)
    label(d,248,97,title,30,TEXT,True); label(d,250,139,tagline,14,MUTED)
    label(d,1558,104,"20 DEC 2026",11,AMBER,True,"ra")
    return im,d
def card(d,box,title,sub=None):
    rounded(d,box,PANEL,LINE,15)
    x,y=box[0]+20,box[1]+17; label(d,x,y,title,17,TEXT,True)
    if sub: label(d,x,y+28,sub,12,MUTED)
def pill(d,x,y,t,col=GREEN,w=None):
    if w is None: w=max(66,int(d.textlength(t,font=F(11,True)))+22)
    rounded(d,(x,y,x+w,y+26),(41,41,41),None,10); label(d,x+w/2,y+13,t,11,col,True,"mm")
def table_header(d,x,y,cols,widths):
    cx=x
    for s,w in zip(cols,widths):
        label(d,cx,y,s,10,DIM,True)
        cx += w
    d.line((x,y+25,x+sum(widths),y+25),fill=LINE,width=1)
def row(d,x,y,vals,widths,colors=None):
    colors=colors or [TEXT]*len(vals)
    for s,w,c in zip(vals,widths,colors): label(d,x,y,str(s),13,c)
    d.line((x,y+34,x+sum(widths),y+34),fill=(42,42,42),width=1)

# 1 Guest management
im,d=base("Guests","Guests","Manage your guest list, invitations and attendance in one place.")
for i,(n,v,c) in enumerate([("TOTAL GUESTS","150",AMBER),("ATTENDING","120",GREEN),("AWAITING RSVP","25",BLUE)]):
    x=250+i*245; rounded(d,(x,174,x+225,260),PANEL,LINE,13); label(d,x+17,189,n,10,MUTED,True); label(d,x+17,210,v,27,TEXT,True); label(d,x+190,216,"↗",16,c,True,"mm")
rounded(d,(1018,174,1568,260),PANEL,LINE,13); label(d,1040,190,"GUEST GROUPS",10,MUTED,True); pill(d,1040,216,"Family · 48",AMBER,104); pill(d,1155,216,"Friends · 62",BLUE,110); pill(d,1277,216,"Work · 40",PURPLE,90)
card(d,(250,280,1568,916),"Guest list","Search, filter and manage invitation status")
rounded(d,(270,337,570,378),(16,16,16),(49,49,49),9); label(d,288,348,"Search name, phone or code",12,DIM)
pill(d,587,345,"All guests",AMBER,91); pill(d,690,345,"Attending",GREEN,93); pill(d,795,345,"Pending",BLUE,82); label(d,1540,355,"Export list  ↓",12,AMBER,True,"ra")
x=278; widths=[220,220,180,180,200,160]; table_header(d,x,404,["GUEST","CONTACT","GROUP","RSVP","INVITATION",""],widths)
guests=[("Amina Hassan","+255 754 221 093","Family","Attending","Sent",GREEN),("David Mushi","+255 713 802 119","Friends","Attending","Opened",GREEN),("Neema Joseph","+255 687 110 275","Family","Maybe","Sent",AMBER), ("Peter Smith","+255 762 094 518","Work","No response","Not sent",BLUE), ("Grace Mwakalinga","+255 655 437 202","Friends","Attending","Opened",GREEN), ("John Mwinyi","+255 784 512 098","Work","Not attending","Sent",RED)]
for i,(name,phone,grp,rsvp,inv,col) in enumerate(guests):
    y=444+i*62; d.ellipse((x,y,x+34,y+34),fill=(54,43,29)); label(d,x+17,y+17,name[0],12,(245,190,105),True,"mm")
    label(d,x+45,y+8,name,13,TEXT,True); label(d,x+45,y+29,phone,10,MUTED)
    label(d,x+220,y+12,phone,12,(184,184,184)); label(d,x+440,y+12,grp,12,(184,184,184)); pill(d,x+620,y+5,rsvp,col)
    label(d,x+800,y+12,inv,12,MUTED); label(d,x+990,y+12,"•••",15,MUTED,True)
label(d,280,850,"Showing 1–6 of 150 guests",11,DIM); label(d,1543,850,"‹     1     2     3     …     25     ›",12,MUTED,False,"ra")
im.save(OUT+r"\frontend-guests.png")

# 2 Check-in
im,d=base("Event day check-in","Check-in","Welcome guests and keep the arrival line moving.")
rounded(d,(250,173,1568,294),(17,17,17),(49,49,49),15)
label(d,278,193,"SCAN GUEST QR CODE",10,AMBER,True)
rounded(d,(278,222,1025,270),(28,28,28),(69,69,69),10); label(d,299,237,"Scan a QR code or enter guest code…",14,MUTED)
rounded(d,(1040,222,1190,270),AMBER,None,10); label(d,1115,246,"Open scanner",13,(20,20,20),True,"mm")
label(d,1221,227,"● SCANNER READY",11,GREEN,True); label(d,1221,247,"Camera connected",11,MUTED)
for i,(n,v,c) in enumerate([("CHECKED IN","87",GREEN),("EXPECTED","120",AMBER),("ARRIVED TODAY","87",BLUE),("CHECK-IN RATE","58%",PURPLE)]):
    x=250+i*330; rounded(d,(x,315,x+310,408),PANEL,LINE,13); label(d,x+18,331,n,10,MUTED,True); label(d,x+18,352,v,28,TEXT,True); label(d,x+278,364,"●",15,c,True,"mm")
card(d,(250,428,1060,926),"Recent arrivals","Live check-in activity")
label(d,1032,449,"View all  →",11,AMBER,True,"ra")
widths=[315,185,140,115]; table_header(d,272,485,["GUEST","GUEST CODE","CHECKED IN",""],widths)
arrivals=[("Amina Hassan","GST-ABC123","3:45 PM"),("David Mushi","GST-DEF892","3:41 PM"),("Grace Mwakalinga","GST-GHI553","3:38 PM"),("Salim Juma","GST-JKL219","3:34 PM"),("Neema Joseph","GST-MNO620","3:30 PM"),("Fatma Ally","GST-PQR741","3:26 PM")]
for i,(a,b,c) in enumerate(arrivals):
    y=529+i*54; label(d,273,y+6,a,13,TEXT,True); label(d,588,y+6,b,12,MUTED); label(d,773,y+6,c,12,(190,190,190)); pill(d,918,y,"Checked in",GREEN,100)
card(d,(1080,428,1568,926),"Guest lookup","Search by name or invitation code")
rounded(d,(1102,493,1545,537),(16,16,16),(49,49,49),9); label(d,1120,507,"Search guest…",12,DIM)
rounded(d,(1102,557,1545,706),(17,17,17),(53,53,53),12)
d.ellipse((1121,578,1171,628),fill=(63,46,28)); label(d,1146,603,"M",17,(245,190,105),True,"mm")
label(d,1187,578,"Mary Jane",16,TEXT,True); label(d,1187,604,"GST-XYZ456 · Attending",11,MUTED)
label(d,1122,651,"RSVP confirmed",11,GREEN,True); label(d,1525,651,"Not checked in",11,AMBER,True,"ra")
rounded(d,(1102,726,1545,779),AMBER,None,10); label(d,1323,753,"Confirm check-in",14,(20,20,20),True,"mm")
label(d,1104,811,"CHECK-IN NOTES",10,DIM,True); label(d,1104,837,"Each invitation code is valid for one guest.",12,MUTED); label(d,1104,860,"Already checked-in guests are flagged.",12,MUTED)
im.save(OUT+r"\frontend-checkin.png")

# 3 Contributions
im,d=base("Contributions","Contributions","Track pledged amounts, confirm payments and keep a clear audit trail.")
for i,(n,v,sub,c) in enumerate([("TOTAL EXPECTED","TSh 9.7M","150 guests",AMBER),("RECEIVED","TSh 8.5M","88% of expected",GREEN),("PENDING","TSh 1.2M","18 payments",BLUE),("CONTRIBUTORS","100","67% of guest list",PURPLE)]):
    x=250+i*330; rounded(d,(x,174,x+310,276),PANEL,LINE,13); label(d,x+18,190,n,10,MUTED,True); label(d,x+18,212,v,25,TEXT,True); label(d,x+18,249,sub,11,c,True)
card(d,(250,296,1568,918),"Payment records","Review each contribution and its current status")
rounded(d,(272,354,565,396),(16,16,16),(49,49,49),9); label(d,290,367,"Search guest or reference",12,DIM)
pill(d,581,362,"All statuses",AMBER,102); pill(d,695,362,"Paid",GREEN,65); pill(d,771,362,"Pending",BLUE,82); pill(d,863,362,"Rejected",RED,88)
rounded(d,(1300,354,1545,396),(33,33,33),(58,58,58),9); label(d,1422,375,"+  Record payment",12,AMBER,True,"mm")
x=276; widths=[245,180,170,150,180,190,130]; table_header(d,x,423,["GUEST","AMOUNT","METHOD","REFERENCE","DATE","STATUS",""],widths)
payments=[("Amina Hassan","150,000","M-PESA","MPESA-8D21","05 Oct · 3:42 PM","Paid",GREEN),("David Mushi","100,000","Bank transfer","BANK-4491","05 Oct · 2:18 PM","Paid",GREEN),("Neema Joseph","50,000","Tigo Pesa","TIGO-109A","05 Oct · 1:55 PM","Pending",BLUE),("Peter Smith","80,000","M-PESA","MPESA-310C","04 Oct · 4:10 PM","Pending",BLUE),("Salim Juma","200,000","Bank transfer","BANK-9280","04 Oct · 1:26 PM","Rejected",RED),("Grace Mwakalinga","75,000","M-PESA","MPESA-734B","03 Oct · 11:04 AM","Paid",GREEN)]
for i,(a,b,c,e,f,g,col) in enumerate(payments):
    y=467+i*61; label(d,x,y+8,a,13,TEXT,True); label(d,x+245,y+8,"TSh "+b,12,(196,196,196)); label(d,x+425,y+8,c,12,MUTED); label(d,x+595,y+8,e,11,MUTED); label(d,x+745,y+8,f,11,MUTED); pill(d,x+930,y,g,col)
    label(d,1516,y+8,"•••",15,MUTED,True,"ra")
label(d,278,858,"Showing 1–6 of 193 payments",11,DIM); label(d,1543,858,"‹     1     2     3     …     33     ›",12,MUTED,False,"ra")
im.save(OUT+r"\frontend-contributions.png")

# 4 Events management
im,d=base("Your events","Overview","A calm overview of every celebration you organize.")
rounded(d,(250,175,1568,292),(17,17,17),(49,49,49),15)
label(d,278,194,"YOUR CELEBRATIONS",11,AMBER,True); label(d,278,220,"Events, guest lists and planning in one place.",14,MUTED)
rounded(d,(1370,207,1540,259),AMBER,None,11); label(d,1455,233,"+  Create event",13,(20,20,20),True,"mm")
events=[("Sam & Regina's Wedding","20 December 2026","Shinyanga, Tanzania","150 guests","Published",GREEN,AMBER),
        ("Asha & Michael's Reception","14 February 2027","Dar es Salaam, Tanzania","86 guests","Planning",BLUE,PURPLE),
        ("Neema's Family Celebration","05 June 2027","Arusha, Tanzania","42 guests","Draft",MUTED,BLUE)]
for i,(name,date,place,guests,status,sc,ac) in enumerate(events):
    y=324+i*190
    rounded(d,(250,y,1568,y+164),PANEL,LINE,15)
    # tasteful preview block
    rounded(d,(270,y+20,520,y+144),(36,29,22),None,12)
    for k in range(5): d.arc((282+k*3,y+34+k*4,510-k*5,y+139-k*3),180,350,fill=(62,48,30),width=1)
    label(d,395,y+70,"S  +  R" if i==0 else ("A  +  M" if i==1 else "N"),28,(231,190,122),True,"mm")
    label(d,550,y+29,name,22,TEXT,True); pill(d,550,y+66,status,sc)
    label(d,550,y+111,date+"     ·     "+place,13,MUTED)
    d.line((1072,y+25,1072,y+138),fill=LINE,width=1)
    label(d,1100,y+32,"GUESTS",10,DIM,True); label(d,1100,y+56,guests,17,TEXT,True)
    label(d,1290,y+32,"QUICK ACCESS",10,DIM,True); label(d,1290,y+61,"Open dashboard  →",13,AMBER,True)
    label(d,1290,y+96,"Manage event  ···",12,MUTED)
rounded(d,(250,914,1568,960),(20,20,20),None,10); label(d,272,929,"You're viewing events for your organizer account.",12,MUTED)
im.save(OUT+r"\frontend-events.png")

# 5 Public RSVP page / guest-facing invitation
im=Image.new("RGB",(W,H),(18,18,18)); d=ImageDraw.Draw(im)
for cx,cy,rx,ry in [(-40,70,420,350),(1510,100,430,320),(770,1030,560,320)]:
    for k in range(9):
        q=.55+k*.085; d.ellipse((int(cx-rx*q),int(cy-ry*q),int(cx+rx*q),int(cy+ry*q)),outline=(28,28,28),width=1)
d.rectangle((0,0,W,72),fill=HEADER); d.line((0,71,W,71),fill=LINE,width=1)
d.text((52,12),"EverAfter",font=F(29,s=True),fill=(210,210,210)); d.ellipse((178,35,187,44),fill=AMBER)
label(d,1548,29,"GUEST INVITATION",11,AMBER,True,"ra")
rounded(d,(205,111,1395,949),(244,236,218),(184,163,129),24,2)
d.rounded_rectangle((229,135,1371,925),radius=18,outline=(214,195,160),width=1)
# ornaments
for cx,cy in [(284,190),(1316,884)]:
    for k in range(8):
        a=math.tau*k/8; ex=cx+math.cos(a)*22; ey=cy+math.sin(a)*22; d.ellipse((ex-10,ey-10,ex+10,ey+10),outline=(216,196,158),width=1)
    d.ellipse((cx-5,cy-5,cx+5,cy+5),outline=(216,196,158),width=1)
label(d,800,180,"YOU'RE INVITED",12,(135,105,59),True,"mm")
label(d,800,220,"Sam & Regina",48,(42,34,29),True,"mm")
label(d,800,281,"would love for you to join them as they celebrate their wedding",15,(103,85,68),False,"mm")
d.line((505,317,1095,317),fill=(197,169,126),width=1); d.polygon([(800,311),(806,317),(800,323),(794,317)],fill=(160,119,54))
label(d,800,350,"SUNDAY  ·  20 DECEMBER 2026",12,(128,99,58),True,"mm")
label(d,800,382,"4:00 PM  ·  SHINYANGA, TANZANIA",14,(76,63,51),True,"mm")
label(d,800,425,"Please let us know if you can make it.",14,(103,85,68),False,"mm")
label(d,800,470,"YOUR RSVP",10,(128,99,58),True,"mm")
rounded(d,(345,495,630,556),(42,101,77),None,12); label(d,487,525,"Joyfully accept",14,(245,245,238),True,"mm")
rounded(d,(657,495,943,556),(232,222,204),None,12); label(d,800,525,"Maybe",14,(72,62,48),True,"mm")
rounded(d,(970,495,1255,556),(232,222,204),None,12); label(d,1112,525,"Regretfully decline",13,(72,62,48),True,"mm")
label(d,800,587,"A personal invitation for Mary Jane",12,(132,105,66),False,"mm")
d.line((580,626,1020,626),fill=(210,193,164),width=1)
label(d,800,655,"YOUR EVENT-DAY PASS",10,(128,99,58),True,"mm")
# decorative sample QR-like grid, distinct plum
rounded(d,(731,681,869,819),(255,252,245),(122,90,116),10,2)
matrix=cv2.QRCodeEncoder_create().encode("https://everafter.example/rsvp/SR-GST-001")
if len(matrix.shape)==3: matrix=cv2.cvtColor(matrix,cv2.COLOR_BGR2GRAY)
qr=Image.fromarray(matrix).convert("L").resize((114,114),Image.Resampling.NEAREST)
qr_rgb=Image.new("RGB",qr.size,(255,252,245))
qp=qr.load(); qd=ImageDraw.Draw(qr_rgb)
for yy in range(qr.height):
    for xx in range(qr.width):
        if qp[xx,yy]<128: qd.point((xx,yy),fill=(93,47,83))
im.paste(qr_rgb,(743,693))
label(d,800,844,"GST-SR-001   ·   Show this code at the entrance",11,(97,75,89),True,"mm")
label(d,800,884,"We can't wait to celebrate with you.",14,(103,85,68),False,"mm")
im.save(OUT+r"\frontend-public-rsvp.png")
