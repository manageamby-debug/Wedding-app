from PIL import Image, ImageDraw, ImageFont

OUT = r"C:\Users\Administrator\Desktop\Wedding-app"
W = 1800
BG = (15, 15, 15)
PANEL = (25, 25, 25)
PANEL2 = (31, 31, 31)
LINE = (54, 54, 54)
TEXT = (225, 225, 225)
MUTED = (150, 150, 150)
DIM = (105, 105, 105)
AMBER = (230, 142, 0)
GET = (82, 177, 194)
POST = (230, 142, 0)
PUT = (113, 167, 218)
DELETE = (220, 104, 104)
PURPLE = (190, 144, 204)

def font(n, bold=False, script=False):
    p = r"C:\Windows\Fonts\segoesc.ttf" if script else (r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf")
    return ImageFont.truetype(p, n)

def rounded(draw, rect, fill, outline=None, radius=14, width=1):
    draw.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=width)

def render(index, title, subtitle, rows, filename):
    top = 230
    row_h = 91
    gap = 11
    H = top + len(rows) * (row_h + gap) + 118
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # Subtle contour-inspired rings
    for cx, cy, rx, ry in [(-20, 80, 400, 260), (1570, 10, 350, 220), (1450, H-80, 500, 300)]:
        for k in range(8):
            x1, y1 = cx-rx*(.56+k*.075), cy-ry*(.56+k*.075)
            x2, y2 = cx+rx*(.56+k*.075), cy+ry*(.56+k*.075)
            d.ellipse((int(x1), int(y1), int(x2), int(y2)), outline=(27,27,27), width=1)
    d.rectangle((0,0,W,84), fill=(11,11,11))
    d.line((0,83,W,83), fill=LINE, width=1)
    d.text((54,17), "EverAfter", font=font(31,script=True), fill=(210,210,210))
    d.ellipse((184,39,194,49),fill=AMBER)
    d.text((W-55,34), f"BACKEND API  /  {index} OF 4", font=font(12,True), fill=AMBER, anchor="ra")
    d.text((55,112), "API REFERENCE", font=font(12,True), fill=AMBER)
    d.text((55,139), title, font=font(34,True), fill=TEXT)
    d.text((57,190), subtitle, font=font(15), fill=MUTED)
    for i, row in enumerate(rows):
        method, path, access, note = row
        y = top + i*(row_h+gap)
        rounded(d, (54,y,W-54,y+row_h), PANEL, LINE, 13)
        col = {"GET":GET,"POST":POST,"PUT":PUT,"DELETE":DELETE}[method]
        rounded(d, (72,y+21,174,y+68), (37,37,37), None, 10)
        d.text((123,y+44),method,font=font(14,True),fill=col,anchor="mm")
        d.text((198,y+16),path,font=font(18,True),fill=TEXT)
        d.text((199,y+52),note,font=font(12),fill=MUTED)
        access_col = PURPLE if "PUBLIC" in access else (AMBER if "ORGANIZER" in access else GET)
        bbox=d.textbbox((0,0),access,font=font(11,True))
        aw=bbox[2]-bbox[0]
        rounded(d,(W-82-aw-28,y+27,W-82,y+62),(42,36,44),None,9)
        d.text((W-96,y+45),access,font=font(11,True),fill=access_col,anchor="rm")
    fy=H-77
    d.line((54,fy,W-54,fy),fill=LINE,width=1)
    d.text((55,fy+20),"PUBLIC  ·  No sign-in     AUTHENTICATED  ·  Signed-in user     ORGANIZER  ·  Organizer role required",font=font(12),fill=MUTED)
    d.text((W-55,fy+20),"METHOD COLORS  GET  ·  POST  ·  PUT  ·  DELETE",font=font(11,True),fill=DIM,anchor="ra")
    im.save(OUT + "\\" + filename)

render("01", "Account & event management", "Authentication and event endpoints · paths are relative to the API server root.", [
    ("POST","/users","PUBLIC","Create an account · 201 Created"),
    ("POST","/users/login","PUBLIC","Log in and receive an access token"),
    ("GET","/users/me","AUTHENTICATED","Read the current account profile"),
    ("POST","/events","ORGANIZER","Create an event · 201 Created"),
    ("GET","/events","AUTHENTICATED","List the signed-in user's events · optional filters"),
    ("GET","/events/{event_id}","AUTHENTICATED","Read an owned event"),
    ("PUT","/events/{event_id}","ORGANIZER","Update an owned event"),
    ("DELETE","/events/{event_id}","ORGANIZER","Delete an owned event"),
], "api-reference-01-account-events.png")

render("02", "Guests, invitations & RSVP", "Guest records are scoped to the organizer's events. Invitation and RSVP links support guests without accounts.", [
    ("POST","/events/{event_id}/guest","ORGANIZER","Add a guest to an owned event · 201 Created"),
    ("GET","/events/{event_id}/guest","ORGANIZER","List guests for an owned event"),
    ("GET","/guests/code/{guest_code}","ORGANIZER","Find a guest by code within organizer scope"),
    ("POST","/guests/code/{guest_code}/check_in","ORGANIZER","Check in a guest within organizer scope"),
    ("PUT","/guests/{guest_id}","ORGANIZER","Update an owned guest"),
    ("DELETE","/guests/{guest_id}","ORGANIZER","Delete an owned guest"),
    ("POST","/invitations","ORGANIZER","Create an invitation for an owned guest · 201 Created"),
    ("GET","/invite/{short_code}","PUBLIC","Open an invitation using its short code"),
    ("POST","/rsvp/{short_code}","PUBLIC","Create or update RSVP using invitation code"),
    ("GET","/rsvp/{short_code}","PUBLIC","Read RSVP using invitation code"),
    ("GET","/events/{event_id}/rsvps","ORGANIZER","List RSVP responses for an owned event"),
    ("GET","/events/{event_id}/rsvp-summary","ORGANIZER","RSVP totals for an owned event"),
], "api-reference-02-guests-invitations-rsvp.png")

render("03", "Check-in & dashboard", "Organizer-only event operations; event ownership is verified for event-scoped routes.", [
    ("POST","/events/{event_id}/check-in/{guest_code}","ORGANIZER","Check in a guest at an owned event"),
    ("GET","/events/{event_id}/check-in/{guest_code}","ORGANIZER","Look up guest check-in details"),
    ("GET","/events/{event_id}/check-in-summary","ORGANIZER","Check-in totals for an owned event"),
    ("GET","/events/{event_id}/checked-in-guests","ORGANIZER","List checked-in guests for an owned event"),
    ("GET","/events/{event_id}/guests/check-in-status","ORGANIZER","List every guest with RSVP/check-in status"),
    ("GET","/events/{event_id}/dashboard","ORGANIZER","Event, guest, RSVP, check-in & contribution overview"),
], "api-reference-03-checkin-dashboard.png")

render("04", "Contributions & payment audit", "Financial records are organizer-only and scoped to the organizer's event or guest.", [
    ("POST","/contributions","ORGANIZER","Create a contribution for an owned guest"),
    ("POST","/contributions/{contribution_id}/confirm","ORGANIZER","Confirm payment for an owned contribution"),
    ("GET","/events/{event_id}/contributions","ORGANIZER","List contributions for an owned event"),
    ("GET","/events/{event_id}/contributions/summary","ORGANIZER","Contribution totals for an owned event"),
    ("GET","/contributions/{contribution_id}/receipt","ORGANIZER","Read receipt for an owned contribution"),
    ("GET","/events/{event_id}/contribution-summary","ORGANIZER","Payment summary for an owned event"),
    ("POST","/contributions/manual","ORGANIZER","Record a manual payment for an owned guest · 201"),
    ("GET","/guests/{guest_id}/contributions","ORGANIZER","List payments for an owned guest"),
    ("POST","/contributions/{contribution_id}/reject","ORGANIZER","Reject a pending owned contribution"),
    ("GET","/contributions/{contribution_id}/audit","ORGANIZER","Read audit history for an owned contribution"),
], "api-reference-04-contributions-audit.png")
