"""Email template definitions for different campaigns."""


def get_teaser_template(name, FORM_LINK):
    """Teaser email template for initial campaign launch."""
    return f"""
    <html>
        <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
            <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
                <div style='padding:32px;'>
                    <p>Hi <b>{name}</b>,</p>
                    <p>Something exciting is coming for original music creators! Singer? Composer? Music Producer? Original Band? </p>
                    <p>Ready to unfold your musical journey? Find out more below!</p>
                    <div style='text-align:center; margin:40px 0;'>
                        <a href='{FORM_LINK}' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.2em; font-weight:bold; display:inline-block;'>Start your Journey Here</a>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """


def get_html_template(name, FORM_LINK):
    """Main campaign email template."""
    return f"""
    <html>
        <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
            <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
                <img src='cid:bannerimage' alt='Havells mYOUsic Banner' style='width:100%; display:block;'>
                <div style='padding:32px;'>
                    <h2 style='color:#ff0000; text-align:center;'>Turn Up the Volume on Your Dreams</h2>
                    <p style='text-align:center; font-size:1.1em;'>Is your music living in a diary, waiting for its moment? 🎶</p>
                    <p>Dear <b>{name}</b>,</p>
                    <p>Have you ever felt that your <span style='color:#ff0000; font-weight:bold;'>original music</span> deserves to be heard by the world?</p>
                    <p>We understand that every <span style='color:#ff0000; font-weight:bold;'>authentic voice</span> needs the right stage to shine. That's why <b>Havells</b> are excited to introduce <b>mYOUsic</b> - a creative space where passionate artists can bring their <span style='color:#ff0000; font-weight:bold;'>original music</span> to life.</p>
                    <p>This isn't another competition - it's your chance to be part of something special. We're creating a <b>learning and collaborative environment</b> where you'll:</p>
                    <ul style='padding-left:20px;'>
                        <li><b>Unfold Your Unique Voice:</b> Join a supportive community where your artistic identity and <span style='color:#ff0000; font-weight:bold;'>original sound</span> can truly flourish.</li>
                        <li><b>Learn from Industry Masters:</b> Get personal guidance from accomplished mentors who are passionate about helping you grow.</li>
                        <li><b>Create Professional Music:</b> Experience the magic of bringing your songs to life in a professional studio.</li>
                        <li><b>Grow Together:</b> Be part of a creative journey where every artist supports and inspires each other.</li>
                    </ul>
                    <p>Whether you're a <span style='color:#ff0000; font-weight:bold;'>Composer</span>, <span style='color:#ff0000; font-weight:bold;'>Singer</span>, <span style='color:#ff0000; font-weight:bold;'>Writer</span>, <span style='color:#ff0000; font-weight:bold;'>Music Producer</span>, or part of a <span style='color:#ff0000; font-weight:bold;'>Band ( Original songs only)</span> - there's a place for you here. If you know someone whose original music deserves to be heard, invite them to join us too!</p>
                    <div style='text-align:center; margin:40px 0;'>
                        <a href='{FORM_LINK}' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.3em; font-weight:bold; display:inline-block;'>Begin Your Journey Here</a>
                    </div>
                    <p style='text-align:center; font-size:0.9em; color:#666; margin-top:15px;'>Submissions will only be accepted through the above link (google form) and submit your original work to be reviewed</p>
                </div>
            </div>
        </body>
    </html>
    """


def get_iml_reminder_template(name):
    """IML Reminder email template."""
    subject = "Don't Miss Out – Submit Your Entry for Insta Music League"
    
    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Don't Miss Out – Submit Your Entry for Insta Music League</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; text-align: center; font-size: 24px; margin-bottom: 20px;">Don't Miss Out – Submit Your Entry!</h2>
                            <p style="font-size: 16px; color: #555555;">Hey {name},</p>
                            <p style="font-size: 16px; color: #555555;">We have received your registration for the Insta Music League!</p>
                            <p style="font-size: 16px; color: #555555;"><strong>Time is running out</strong> to submit your songs — <strong>we can't wait to hear your sound!</strong></p>
                            <h3 style="color: #333333; border-bottom: 2px solid #ff0000; padding-bottom: 5px; margin-top: 30px;">Here's How to Participate:</h3>
                            <ol style="font-size: 16px; color: #555555; line-height: 1.8; padding-left: 20px;">
                                <li style="margin-bottom: 10px;"><strong>Record</strong> – Sing and record in a clear, quiet space. Home recordings are perfect!</li>
                                <li style="margin-bottom: 10px;"><strong>Upload</strong> – Post your clip as a Reel, use #IMLbyTSC, and send us a collab invite on @the_shakti_collective.</li>
                                <li style="margin-bottom: 10px;"><strong>Apply</strong> – Complete the official application form to confirm your entry.</li>
                            </ol>
                            <p style="font-size: 16px; color: #555555; text-align: center; margin-top: 30px;">You can submit up to <strong>5 original songs</strong> by <strong>December 7, 2025, 11:59 PM</strong>.</p>
                            <p style="font-size: 16px; color: #555555; text-align: center;"><strong>Don't miss your chance</strong> to showcase your talent to the world.</p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 20px 30px 40px;">
                            <a href="http://iml.tscacademy.in" style="background-color: #ff0000; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Submit Now!</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f2f2f2; text-align: center;">
                            <p style="font-size: 16px; color: #555555; margin: 0;">Warm regards,<br><strong>Team Insta Music League</strong></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return subject, html_body


def get_final_call_template(name):
    """IML Final Call email template."""
    subject = "FINAL CALL: 2000+ Entries In, Secure Your Spot in the Insta Music League."
    
    html_body = f"""
<html>
    <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
        <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
            <div style='padding:32px;'>
                <h2 style='color:#ff0000; text-align:center;'>FINAL CALL: Your Last Chance!</h2>
                <p>Dear <b>{name}</b>,</p>
                <p>Over <b>2000+ talented artists</b> have already submitted their entries to the Insta Music League!</p>
                <p>This is your <b>final call</b> to showcase your talent and join this incredible community.</p>
                <p>Don't let this opportunity slip away!</p>
                <div style='text-align:center; margin:40px 0;'>
                    <a href='http://iml.tscacademy.in' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.2em; font-weight:bold; display:inline-block;'>Submit Your Entry Now</a>
                </div>
            </div>
        </div>
    </body>
</html>
"""
    return subject, html_body


def get_masterclass_template(name):
    """Masterclass promotional email template."""
    subject = "Unlock the Secrets of Music Composition!"
    
    html_body = f"""
<html>
    <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
        <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
            <div style='padding:32px;'>
                <h2 style='color:#ff0000; text-align:center;'>Unlock the Secrets of Music Composition!</h2>
                <p>Dear <b>{name}</b>,</p>
                <p>Learn directly from industry legends how to compose, produce, and perfect your original music.</p>
                <p>Limited seats available. Don't miss this exclusive masterclass!</p>
                <div style='text-align:center; margin:40px 0;'>
                    <a href='#' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.2em; font-weight:bold; display:inline-block;'>Learn More</a>
                </div>
            </div>
        </div>
    </body>
</html>
"""
    return subject, html_body
