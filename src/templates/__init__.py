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
                    <p style='text-align:center; font-size:1.1em; margin-top:20px;'><b>Submission Deadline: 19th Feb 11:59pm</b></p>
                    <div style='text-align:center; margin:40px 0;'>
                        <a href='{FORM_LINK}' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.3em; font-weight:bold; display:inline-block;'>Begin Your Journey Here</a>
                    </div>
                    <p style='text-align:center; font-size:0.9em; color:#666; margin-top:15px;'>Submissions will only be accepted through the above link and submit your original work to be reviewed</p>
                </div>
            </div>
        </body>
    </html>
    """






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


def get_havells_myousic_template(name):
    """Havells mYOUsic platform promotional email template."""
    subject = "Amplify Your Music on Havells mYOUsic 🎵"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style='margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f5f5;'>
    <div style='max-width:700px; margin:auto; background:#ffffff;'>
        
        <!-- Banner Image -->
        <div style='overflow:hidden;'>
            <img src='cid:bannerimage' alt='Havells mYOUsic' style='width:100%; display:block; max-height:280px; object-fit:cover;'>
        </div>
        
        <!-- Main Content -->
        <div style='padding:40px 50px; background:#ffffff;'>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Hey {name},
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                We hope this finds you well.
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Havells mYOUsic is building a platform where emerging music talent gets discovered, nurtured, and celebrated—and we'd love your help in spreading the word.
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                This initiative offers young and independent artists access to mentorship from industry legends, immersive bootcamps, and opportunities to create original music, shoot videos, and professionally record their tracks.
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 35px 0; text-align:justify;'>
                If you know of any artists, musicians, composers, singers, or creators who would benefit from this opportunity, we'd greatly appreciate it if you could share this with them and help us reach the right talent.
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 35px 0; text-align:justify;'>
                Together, let's amplify voices that deserve to be heard.
            </p>
            
            <p style='font-size:18px; font-weight:bold; color:#000000; margin:0 0 35px 0; text-align:center;'>Ready to amplify your music?</p>
            
            <!-- Primary CTA Button -->
            <table width='100%' cellspacing='0' cellpadding='0' style='margin:0 0 25px 0;'>
                <tr>
                    <td align='center'>
                        <a href='https://forms.gle/eFyhEW3ifTdtByvm7' style='background:#c7302f; color:#ffffff; padding:16px 50px; text-decoration:none; border-radius:2px; font-size:16px; font-weight:bold; display:inline-block; border:none; cursor:pointer; box-shadow:0 4px 8px rgba(0,0,0,0.15); letter-spacing:1px;'>REGISTER NOW</a>
                    </td>
                </tr>
            </table>
            
            <!-- Secondary CTA Link -->
            <p style='font-size:14px; margin:20px 0 0 0; text-align:center;'>
                For more details visit - <a href='https://havellsmyousic.com' style='color:#c7302f; text-decoration:none; font-weight:bold;'>havellsmyousic.com</a>
            </p>
            
        </div>
        
        <!-- Footer -->
        <div style='padding:30px; text-align:center; background:#000000; color:#ffffff; font-size:12px; line-height:1.6; border-top:3px solid #c7302f;'>
            <p style='margin:0 0 8px 0;'>Warm regards,</p>
            <p style='margin:0; color:#cccccc;'>Team Havells mYOUsic<br>© 2026 Havells mYOUsic. All rights reserved.</p>
        </div>
        
    </div>
</body>
</html>
"""
    return subject, html_body


def get_havells_myousic_call_template(name):
    """Havells mYOUsic final call email template with submission deadline and audition details."""
    subject = "Last Chance to Submit Your Music to Havells mYOUsic 🎵"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style='margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f5f5;'>
    <div style='max-width:700px; margin:auto; background:#ffffff;'>
        
        <!-- Banner Image -->
        <div style='overflow:hidden;'>
            <img src='cid:bannerimage' alt='Havells mYOUsic' style='width:100%; display:block; max-height:280px; object-fit:cover;'>
        </div>
        
        <!-- Main Content -->
        <div style='padding:40px 50px; background:#ffffff;'>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Hey,
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Hope you're doing great!
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Havells mYOUsic is the platform discovering, nurturing, and celebrating emerging music talent—and we need your help to spread the word.
            </p>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Young artists get mentorship from industry legends, immersive bootcamps, and chances to create original tracks, shoot videos, and record professionally.
            </p>
            
            <!-- Important Deadline Alert -->
            <div style='background:#fff3cd; border-left:4px solid #c7302f; padding:15px; margin:30px 0; border-radius:4px;'>
                <p style='font-size:15px; font-weight:bold; color:#c7302f; margin:0 0 10px 0;'>⏰ Last Chance!</p>
                <p style='font-size:15px; line-height:1.8; color:#333333; margin:0; text-align:justify;'>
                    Last chance to submit entries: <strong>February 21st, 11:59 PM</strong>
                </p>
                <p style='font-size:14px; line-height:1.8; color:#333333; margin:10px 0 0 0; text-align:justify;'>
                    <strong>Plus, join our offline audition in Delhi on February 22nd!</strong>
                </p>
            </div>
            
            <p style='font-size:15px; line-height:1.8; color:#333333; margin:0 0 25px 0; text-align:justify;'>
                Know any musicians, composers, singers, or creators who'd thrive here? Please share this with them—we're counting on you to connect us with the next big voices.
            </p>
            
            <!-- Primary CTA Button -->
            <table width='100%' cellspacing='0' cellpadding='0' style='margin:0 0 25px 0;'>
                <tr>
                    <td align='center'>
                        <a href='https://forms.gle/eFyhEW3ifTdtByvm7' style='background:#c7302f; color:#ffffff; padding:16px 50px; text-decoration:none; border-radius:2px; font-size:16px; font-weight:bold; display:inline-block; border:none; cursor:pointer; box-shadow:0 4px 8px rgba(0,0,0,0.15); letter-spacing:1px;'>REGISTER NOW</a>
                    </td>
                </tr>
            </table>
            
            <!-- Secondary CTA Link -->
            <p style='font-size:14px; margin:20px 0 0 0; text-align:center;'>
                Details at - <a href='https://havellsmyousic.com' style='color:#c7302f; text-decoration:none; font-weight:bold;'>havellsmyousic.com</a>
            </p>
            
        </div>
        
        <!-- Footer -->
        <div style='padding:30px; text-align:center; background:#000000; color:#ffffff; font-size:12px; line-height:1.6; border-top:3px solid #c7302f;'>
            <p style='margin:0 0 8px 0;'>Warm regards,</p>
            <p style='margin:0; color:#cccccc;'>Team Havells mYOUsic<br>© 2026 Havells mYOUsic. All rights reserved.</p>
        </div>
        
    </div>
</body>
</html>
"""
    return subject, html_body


def get_gmi_confirmation_template(name):
    """Havells mYOUsic GMI Event Confirmation email template."""
    subject = "🎤 Your Music Journey Begins: Confirmation for Havells mYOUsic"
    
    instagram_link = "https://www.instagram.com/the_shakti_collective/"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
    <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
        <img src='cid:bannerimage' alt='Havells mYOUsic Banner' style='width:100%; display:block;'>
        <div style='padding:32px;'>
            <p>Hello <b>{name}</b>!</p>
            <p>Thank you for registering for <b>Havells mYOUsic</b>. We are thrilled to welcome you into a space designed specifically to celebrate and elevate emerging artist talent.</p>
            <p>This isn't just an audition—it's an opportunity to showcase your sound and engage in exclusive knowledge-sharing sessions with seasoned mentors in the music industry. Whether you are on stage or in the audience, come prepared to learn, connect, and grow.</p>
            
            <h3 style='color:#ff0000; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;'>Event Details:</h3>
            <ul style='list-style: none; padding: 0;'>
                <li>📅 <b>Date:</b> Sunday, 22nd February</li>
                <li>📍 <b>Venue:</b> Global Music Institute (GMI), Noida</li>
                <li>⏰ <b>Gate Timings:</b> 08:30 AM – 10:30 AM <span style='color:#ff0000;'>(Entry closes strictly at 10:30 AM)</span></li>
                <li>🌐 <b>Official Portal:</b> <a href='https://havellsmyousic.com' style='color:#ff0000; text-decoration:none;'>havellsmyousic.com</a></li>
            </ul>

            <h3 style='color:#ff0000; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;'>What to Expect:</h3>
            <ul style='padding-left: 20px;'>
                <li><b>Live Auditions:</b> Your moment to shine in front of our panel.</li>
                <li><b>Mentor Interactions:</b> Gain insights into the industry directly from the pros.</li>
                <li><b>Networking:</b> Connect with fellow artists and the Havells mYOUsic community.</li>
            </ul>

            <h3 style='color:#ff0000; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;'>Important Instructions:</h3>
            <ul style='padding-left: 20px;'>
                <li>Please carry a valid <b>government ID</b> for entry.</li>
                <li><b>8:30am Gate opens</b> to settle in and soak up the atmosphere before your check-in.</li>
                <li>If you have specific technical needs for your set, our stage crew will be available to assist you upon arrival.</li>
            </ul>

            <p style='text-align:center; font-weight:bold; font-size:1.1em; margin-top:30px;'>Stay updated with the latest announcements!</p>
            
            <div style='text-align:center; margin:20px 0;'>
                <a href='{instagram_link}' style='background:#E1306C; color:#fff; padding:15px 30px; border-radius:5px; text-decoration:none; font-weight:bold; margin:5px; display:inline-block;'>📸 Visit Instagram for Updates</a>
            </div>

            <p>We can’t wait to hear your story and your sound!</p>
            
            <p style='margin-top:30px; color:#666;'>
                Best regards,<br>
                <b>Team Havells mYOUsic</b>
            </p>
        </div>
    </div>
</body>
</html>
"""
    return subject, html_body


def get_gmi_final_template(name):
    """Havells mYOUsic Final Event Details email template."""
    subject = "🎤 Final Details: Havells mYOUsic Auditions Tomorrow!"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
    <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
        <img src='cid:bannerimage' alt='Havells mYOUsic Banner' style='width:100%; display:block;'>
        <div style='padding:32px;'>
            <p>Hi <b>{name}</b>! 🎤</p>
            
            <p>The stage is set and we are thrilled to have you join the Havells mYOUsic movement. This is more than an audition; it’s the first step in building a new ecosystem for independent artists like you.</p>
            
            <h3 style='color:#ff0000; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;'>Your Audition & Knowledge Session Details:</h3>
            <ul style='list-style: none; padding: 0;'>
                <li>📅 <b>Date:</b> Sunday, 22nd February</li>
                <li>📍 <b>Venue:</b> Global Music Institute (GMI), Noida</li>
                <li>⏱️ <b>Gate Timings:</b> 08:30 AM – 10:30 AM</li>
            </ul>

            <p><b>Why you should be here early</b> - to witness knowledge sharing sessions from industry leaders and see artists unfold their raw talent.</p>

            <h3 style='color:#ff0000; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;'>📑 Essential Prep:</h3>
            <p>Please find the attached PDF Guide for the full event flow, rules, and audition requirements.</p>

            <p><b>Remember:</b> We value authenticity over perfection. Mistakes are welcome!</p>

            <p>See you super soon!<br>
            <b>Team Havells mYOUsic ⚡</b></p>
        </div>
    </div>
</body>
</html>
"""
    return subject, html_body


def get_tsc_academy_template(name):
    """TSC Academy 'The heART of Music Composition' email template."""
    subject = "UNFOLD Your Music Composition Potential with TSC Academy!"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style='margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;'>
    <div style='max-width:650px; margin:auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05); margin-top:30px; margin-bottom:30px;'>
        
        <!-- Banner Image Placeholder -->
        <div style='overflow:hidden; background-color: #1a1a2e; text-align: center;'>
            <img src='cid:bannerimage' alt='TSC Academy - The heART of Music Composition' style='width:100%; display:block; max-height:300px; object-fit:cover; color: #ffffff; line-height: 200px; font-size: 18px;'>
        </div>
        
        <!-- Main Content -->
        <div style='padding:40px 50px; background:#ffffff;'>
            
            <h2 style='color:#1a1a2e; text-align:center; font-size: 24px; margin-top: 0; margin-bottom: 25px;'>
                UNFOLD Your Music Composition Potential!
            </h2>
            
            <p style='font-size:16px; line-height:1.6; color:#333333; margin:0 0 20px 0;'>
                Dear <b>{name}</b>,
            </p>
            
            <p style='font-size:16px; line-height:1.6; color:#333333; margin:0 0 30px 0;'>
                Imagine transforming your compositions from good to industry-ready masterpieces under the direct guidance of Bollywood legend <strong>Sandesh Shandilya</strong>.
            </p>
            
            <!-- Features Section -->
            <div style='background:#f9f9fa; border-left:4px solid #d4af37; padding:25px; margin:0 0 30px 0; border-radius:0 4px 4px 0;'>
                <h3 style='margin: 0 0 15px 0; color: #1a1a2e; font-size: 18px;'>What's Inside</h3>
                <ul style='margin: 0; padding-left: 20px; color: #333333; line-height: 1.8; font-size: 15px;'>
                    <li style='margin-bottom: 10px;'><strong>Mentorship:</strong> 12+ Live Interactive Sessions with personalized feedback.</li>
                    <li style='margin-bottom: 10px;'><strong>Content:</strong> 200+ minutes of recorded masterclasses.</li>
                    <li style='margin-bottom: 10px;'><strong>Access:</strong> 1-year material access + Lifetime community support.</li>
                    <li style='margin-bottom: 10px;'><strong>The Pitch:</strong> A chance to pitch your music on "The Young Gunns Demo Day."</li>
                    <li><strong>Hands-On Growth:</strong> 14 chapters with assignments, from creative processes and bhaav (emotions) to nature patterns, samarpan, lyrics integration, collaborations, and how to get into your subconscious self.</li>
                </ul>
            </div>
            
            <p style='font-size:17px; line-height:1.6; color:#1a1a2e; margin:0 0 30px 0; text-align:center; font-style: italic; font-weight: bold;'>
                "This isn't just a course—it's a launchpad to unlock your artist force!"
            </p>
            
            <!-- Accelerator Highlight -->
            <div style='background:#1a1a2e; color:#ffffff; padding:25px; border-radius:6px; margin:0 0 35px 0; text-align:center;'>
                <h4 style='color:#d4af37; margin:0 0 12px 0; font-size:18px; text-transform:uppercase; letter-spacing: 1px;'>Exclusive Accelerator Feature</h4>
                <p style='margin:0; font-size:15px; line-height:1.6;'>
                    <strong>At least One Song Composition:</strong> To be looked over by Sandesh Shandilya himself (Accelerator program) and the opportunity to release a track with community support.
                </p>
            </div>
            
            <!-- CTAs -->
            <div style='text-align:center; margin:0 0 40px 0;'>
                <a href='https://tscacademy.exlyapp.com/checkout/1d0a602b-3c35-401c-8c43-1b88780520f2?dynamic_link=8f97793a-18dd-471f-9b2b-3bc046936957' style='background:#f4f4f4; color:#1a1a2e; padding:16px 25px; text-decoration:none; border-radius:4px; font-size:15px; font-weight:bold; display:inline-block; margin: 10px 5px; border: 2px solid #1a1a2e;'>Join Foundation Program</a>
                <a href='https://tscacademy.exlyapp.com/checkout/55bdc656-c92d-4812-a775-944d5becf544?dynamic_link=733fcf13-0d2f-4524-b595-52b096b483a6' style='background:#d4af37; color:#1a1a2e; padding:16px 25px; text-decoration:none; border-radius:4px; font-size:15px; font-weight:bold; display:inline-block; margin: 10px 5px; border: 2px solid #d4af37;'>Join Accelerator Program</a>
            </div>
            
            <hr style='border:none; border-top:1px solid #eeeeee; margin:0 0 25px 0;'>
            
            <p style='font-size:14px; line-height:1.6; color:#666666; margin:0; text-align:center;'>
                Have questions? We're here to help.<br>
                Contact us: <a href="tel:+919168665455" style="color: #1a1a2e; font-weight: bold; text-decoration: none;">+91 9168665455</a>
            </p>
            
        </div>
        
        <!-- Footer -->
        <div style='padding:25px; text-align:center; background:#1a1a2e; color:#ffffff; font-size:12px; line-height:1.6; border-top: 3px solid #d4af37;'>
            <p style='margin:0 0 8px 0;'>Warm regards,</p>
            <p style='margin:0; color:#cccccc;'>Team TSC Academy<br>© 2026 TSC Academy. All rights reserved.</p>
        </div>
        
    </div>
</body>
</html>
"""
    return subject, html_body
