from PIL import Image, ImageDraw, ImageFont
import math
import random

S = 2
W, H = 1600, 1120
im = Image.new("RGB", (W*S, H*S), (18, 18, 18))
d = ImageDraw.Draw(im)

BG = (18, 18, 18)
PANEL = (9, 9, 9)
CARD = (24, 24, 24)
CARD2 = (30, 30, 30)
BORDER = (44, 44, 44)
TEXT = (220, 220, 220)
MUTED = (143, 143, 143)
DIM = (98, 98, 98)
AMBER = (230, 142, 0)
PALE_AMBER = (255, 190, 78)
GREEN = (100, 193, 145)
BLUE = (112, 174, 216)

def fnt(size, bold=False, script=False):
    path = r"C:\Windows\Fonts\segoesc.ttf" if script else (r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf")
    return ImageFont.truetype(path, size*S)

def box(x1,y1,x2,y2, fill, outline=None, radius=16, width=1):
    d.rounded_rectangle((x1*S,y1*S,x2*S,y2*S), radius=radius*S, fill=fill,
                        outline=outline, width=width*S if outline else 1)

def txt(x,y,s,size=16,color=TEXT,bold=False,anchor=None,script=False):
    d.text((x*S,y*S),s,font=fnt(size,bold,script),fill=color,anchor=anchor)

def line(points, fill, width=1):
    d.line([(int(x*S),int(y*S)) for x,y in points], fill=fill, width=width*S, joint="curve")

def contour(cx,cy,rx,ry,seed,clip=None):
    rng=random.Random(seed)
    phase=rng.random()*math.tau
    for j in range(9):
        k=0.62+j*0.105
        pts=[]
        for i in range(241):
            a=math.tau*i/240
            wobble=1+0.075*math.sin(3*a+phase)+0.035*math.sin(5*a-phase*1.4)+0.018*math.cos(8*a+phase)
            x=cx+rx*k*wobble*math.cos(a)
            y=cy+ry*k*wobble*math.sin(a)
            if clip is None or (clip[0] <= x <= clip[2] and clip[1] <= y <= clip[3]):
                pts.append((x,y))
        if len(pts)>2:
            line(pts,(27,27,27),1)

# Editorial topographic backdrop
for c in [(-35,165,410,280,11),(380,35,285,190,28),(840,180,460,290,38),(1530,90,430,270,45),(-10,720,420,280,53),(715,850,490,300,71),(1450,760,460,300,81)]:
    contour(*c)

# Header
d.rectangle((0,0,W*S,84*S), fill=(13,13,13))
line([(0,83),(1600,83)],(38,38,38),1)
txt(52,11,"EverAfter",32,(210,210,210),script=True)
d.ellipse((184*S,35*S,194*S,45*S),fill=AMBER)
txt(330,30,"Overview",15,AMBER,True)
txt(432,30,"Guests",15,(177,177,177))
txt(510,30,"Invitations",15,(177,177,177))
txt(617,30,"Contributions",15,(177,177,177))
txt(759,30,"Check-in",15,(177,177,177))
box(1126,15,1329,67,(30,30,30),(69,69,69),14)
d.ellipse((1145*S,36*S,1157*S,48*S),fill=AMBER)
txt(1172,31,"Matte Black",14,TEXT,True)
txt(1294,31,"v",14,MUTED,True)
box(1344,15,1545,67,AMBER,None,14)
txt(1444,41,"+   Add guest",15,(20,20,20),True,anchor="mm")

# Title block
txt(54,112,"ORGANIZER DASHBOARD",12,AMBER,True)
txt(54,136,"Good evening, Samajemba.",37,(218,218,218),True)
txt(56,187,"Your celebration, at a glance. Everything is coming together.",16,MUTED)
txt(1544,120,"MONDAY, 05 OCTOBER 2026",11,MUTED,True,anchor="ra")

# Appearance picker: deliberately compact but visible in the dashboard demo
box(1072,143,1545,340,(11,11,11),(53,53,53),16)
txt(1094,157,"APPEARANCE",11,AMBER,True)
txt(1094,178,"Choose a look for your dashboard",13,MUTED)
for i,(label,active) in enumerate([("Auto",False),("Light",False),("Dark",True)]):
    x=1092+i*143
    box(x,207,x+132,239,(32,32,32),AMBER if active else None,10)
    txt(x+66,223,label,12,TEXT if active else MUTED,active,anchor="mm")
txt(1094,264,"THEMES",10,DIM,True)
themes=[("Matte Black",(230,142,0),True),("Miasma",(181,165,83),False),("Nord",(121,177,199),False),("Osaka Jade",(56,190,158),False)]
for i,(label,col,active) in enumerate(themes):
    x=1094+(i%2)*220; y=282+(i//2)*36
    d.ellipse((x*S,y*S,(x+14)*S,(y+14)*S),fill=col)
    txt(x+23,y-2,label,12,TEXT if active else MUTED,active)

# Event hero card
box(54,228,1036,427,(13,13,13),(49,49,49),19)
contour(786,325,245,125,103,clip=(54,228,1036,427))
txt(82,253,"YOUR NEXT CELEBRATION",11,AMBER,True)
txt(82,278,"Sam & Regina's Wedding",30,TEXT,True)
txt(84,326,"Sunday, 20 December 2026",16,(194,194,194),True)
txt(84,356,"Shinyanga, Tanzania",14,MUTED)
box(82,385,251,411,(38,38,38),None,9)
txt(166,398,"●  Event published",12,GREEN,True,anchor="mm")
line([(659,258),(659,396)],(53,53,53),1)
txt(696,264,"COUNTDOWN",11,MUTED,True)
txt(695,292,"76",60,AMBER,True)
txt(775,321,"DAYS TO GO",12,MUTED,True)
txt(697,363,"The big day is getting closer.",13,(165,165,165))

# Stat cards
stats=[("GUESTS","150","Total invited","+12 this week",AMBER),
       ("ATTENDING","120","RSVP confirmed","80% response rate",GREEN),
       ("CHECKED IN","87","On event day","58% of guest list",BLUE),
       ("CONTRIBUTIONS","TSh 8.5M","Confirmed received","of TSh 9.7M expected",PALE_AMBER)]
for i,(label,val,sub,foot,col) in enumerate(stats):
    x=54+i*251
    box(x,448,x+235,590,CARD,(48,48,48),16)
    txt(x+18,466,label,10,MUTED,True)
    txt(x+18,487,val,29,TEXT,True)
    txt(x+18,529,sub,13,(175,175,175))
    txt(x+18,555,foot,11,col,True)
    d.ellipse(((x+204)*S,466*S,(x+218)*S,480*S),fill=col)

# Lower cards
box(54,612,785,1004,CARD,(48,48,48),16)
txt(78,634,"RSVP overview",20,TEXT,True)
txt(78,664,"Guest responses across your event",13,MUTED)
txt(758,643,"View guests  →",12,AMBER,True,anchor="ra")
responses=[("Attending",120,AMBER),("Not attending",20,(105,105,105)),("Maybe",5,(181,165,83)),("No response",5,(67,67,67))]
maxv=150
for i,(lab,v,col) in enumerate(responses):
    y=712+i*65
    txt(80,y,lab,14,(190,190,190))
    txt(758,y,str(v),14,TEXT,True,anchor="ra")
    box(80,y+26,759,y+34,(48,48,48),None,4)
    box(80,y+26,80+679*v/maxv,y+34,col,None,4)
txt(80,977,"150 guests total",11,DIM)

box(810,612,1545,1004,CARD,(48,48,48),16)
txt(834,634,"Contribution summary",20,TEXT,True)
txt(834,664,"Payments recorded for this event",13,MUTED)
box(834,702,1520,827,(17,17,17),None,12)
txt(854,719,"TOTAL RECEIVED",10,MUTED,True)
txt(854,742,"TSh 8,500,000",29,TEXT,True)
txt(1498,757,"88%",16,AMBER,True,anchor="ra")
box(854,790,1498,798,(47,47,47),None,4)
box(854,790,1420,798,AMBER,None,4)
txt(854,810,"TSh 9,700,000 expected",11,MUTED)
txt(834,850,"RECENT PAYMENTS",10,DIM,True)
payments=[("Amina Hassan","M-PESA · 03:42 PM","TSh 150,000"),
          ("David Mushi","Bank transfer · 02:18 PM","TSh 100,000"),
          ("Neema Joseph","Tigo Pesa · 11:06 AM","TSh 50,000")]
for i,(name,meta,amt) in enumerate(payments):
    y=879+i*42
    if i: line([(834,y-8),(1520,y-8)],(45,45,45),1)
    d.ellipse((834*S,(y+1)*S,862*S,(y+29)*S),fill=(56,45,27))
    txt(848,y+15,name[:1],12,PALE_AMBER,True,anchor="mm")
    txt(874,y,name,13,TEXT,True)
    txt(874,y+19,meta,10,MUTED)
    txt(1508,y+8,amt,12,(199,199,199),True,anchor="ra")

# Footer
line([(54,1030),(1545,1030)],(40,40,40),1)
txt(54,1053,"EVERAFTER  /  ORGANIZER",10,DIM,True)
txt(1545,1053,"THEME  ·  MATTE BLACK",10,AMBER,True,anchor="ra")

im=im.resize((W,H),Image.Resampling.LANCZOS)
im.save(r"C:\Users\Administrator\Desktop\Wedding-app\wedding-dashboard-matte-black-demo.png")
