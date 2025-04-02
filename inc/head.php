<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>REBs – Moving Forward</title>


<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Noto+Serif:wdth,wght@75,800&display=swap" rel="stylesheet">



<script async src="https://tally.so/widgets/embed.js"></script>
    <style>


        body {
            font-family: "Montserrat", sans-serif;
            font-weight: 400;
            font-size: 22px;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0px;
            background: white;
            width: 98%;
        }
        .logo img {
            height: 100px;
        }
        .nav-links {
            list-style: none;
            display: flex;
            gap: 30px;
        }
        .nav-links li {
            display: inline;
        }
        .nav-links a {
            text-decoration: none;
            color: black;
            font-size: 18px;
        }

        .nav-links a:hover {
            border-bottom: 2px solid red;
        }

        .member-btn {
            background: #33498e;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 18px;
        }
        .member-btn:hover {
            background: #d74a48;
        }
        .hamburger {
            display: none;
            flex-direction: column;
            cursor: pointer;
            transition: 0.3s;
        }
        .hamburger div {
            width: 30px;
            height: 3px;
            background: black;
            margin: 5px 0;
            transition: 0.3s;
        }
        .hamburger.active div:nth-child(1) {
            transform: translateY(13px) rotate(45deg);
        }
        .hamburger.active div:nth-child(2) {
            opacity: 0;
        }
        .hamburger.active div:nth-child(3) {
            transform: translateY(-13px) rotate(-45deg);
        }
        .mobile-menu {
            display: none;
            flex-direction: column;
            align-items: center;
            position: absolute;
            top: 90px;
            left: 0;
            width: 100%;
            background: white;
            text-align: center;
            padding: 20px 0;
            z-index: 1000;
        }
        .mobile-menu a {
            padding: 10px;
            margin: 5px 0;
            text-decoration: none;
            color: black;
            font-size: 20px;
            width:100%;
        }
        .mobile-menu.active {
    display: flex;
    }












        h1 {
            color: #ffffff;
            font-size: 3.5em;
            font-style: italic;
            font-weight: Bold;
            font-family: "Noto Serif", serif;
            text-transform: capitalize;
        }
        h2 {
            color: #33498e;
            font-weight: Bold;
            font-family: "Noto Serif", serif;
            text-transform: capitalize;
        }   

        strong {
            color: #33498e;
            font-weight: 700;
            font-style: italic;
            font-size: 26px;
        }


   

/* Container holding the hero image and text */
.container {
  position: relative;
  text-align: center;
}

/* Overlay hero text */
.hero-overlay {
  position: absolute;
  top: 0px;
  width: 100%;
  height: 99% ;
  padding:;
  z-index: 1;
  color: #ffffff;
  text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.2); 
}
.hero-headline {
    position:absolute;
    top:25%;
    left:40px;
}

/* hero image aspect ratio */
    .image-container {
        width: 100%;
        aspect-ratio: 20 / 8; 
        
    }
    .cropped-image {
        width: 100%;
        height: 100%;
        object-fit: cover; /* Crop and cover the container */

    }



/* quotation */
    .quote {text-align: center;font-size: 2em; font-family:'Noto Sans'; font-style: italic;}
    .qleft{color:#33498e;text-align:left; font-size: 7em;}
    .qright {color:#33498e;text-align: right; font-size: 7em; line-height: .75em;}
    .qtext {margin-top:-4em;padding:0px 3em;}



        /* First Row */
        .first-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            padding: 0px;
        }
        .first-row img {
            max-width: 40%;
            height: auto;
            flex: 1;
        }
        .first-row h1 {
            flex: 1;
            text-align: center;
        }

        /* Second Row */
        .second-row {
            padding: 24px;
            line-height:1.8;
            text-align: left;
        }

        /* Third Row */
        .third-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            text-align: center;
            padding: 0px;
        }
        .third-row div {
            background-color: #83a9da;
            flex: 1;
            padding: 15px;
            max-width: ;
            border: 4px solid #a8c5e7;
            margin: 2px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .third-row div:hover {
            background: #a8c5e7;
            border-bottom: 4px solid red;
        }
        .third-row ul {
            text-align: left;
            padding-left: 3.5em;
        }

        /* Fourth Row */






        /* Footer */
        footer {
            background: #000;
            color: white;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-around;
            font-family: montserrat;
            font-size: 18px;
            margin-top:-10px;
        }
        .footer-column a:hover {text-decoration: underline #d12428 4px;}
        .footer-column {
            flex: 1;
            padding-left: 60px;
            padding-right: 20px;
            padding-top:100px;
            padding-bottom: 100px;
            min-width: 200px;
        }
        .footer-column a {
            display: block;
            color: white;
            text-decoration: none;
            margin: 5px 0;

        }

  .social-icon  {
    color: #1185fe; /* Default color */
    transition: color 0.3s ease-in-out;
  }

  .social-icon :hover {
    color: white; /* Hover color */
  }




@media (max-width: 1023px) {

    h1 {font-size: 2.5em;}
    .nav-links, .member-btn {
        display: none;
    }

    .hamburger {
        display: flex;
        margin-right:10px;
        }

    ul {
grid-template-columns: repeat(2, 1fr) !important;

    }   

    /* quotation */
    .quote {font-size: 1.5em; }
    .qleft{font-size: 5em;}
    .qright {font-size: 5em; line-height: .75em;}
    .qtext {margin-top:-4em;padding:0px 3em;}

}




@media (max-width:768px) {

h1 {font-size: 1.5em;}
    .hero-headline {
        margin-top:10px;
}

ul {
grid-template-columns: 1fr !important;
}

    /* Stack first-row elements */
    .first-row {
        flex-direction: column;
        text-align: center;
        width: 100%;
        padding:0px;
        margin-top: 20px;
    }
    .first-row img, .first-row h1 {
        max-width: 100%;
        width: 100%;
        padding:0px;
    }
    .second-row {padding:20px;}

    /* Stack third-row elements */
    .third-row {
        flex-direction: column;
        display: block;
        align-items: center;
        width: 100%;
        padding:0px;
    }
        .third-row div {
        max-width: 100%;
    }

ul {
padding-left: 15px;
}


    /* quotation */
    .quote {font-size: 1.3em; }

    .footer-column {
        padding-left: 90px;
    padding-right: 20px;
    padding-top:30px;
    padding-bottom: 30px;
    }

}
    </style>
</head>
<body>

    <nav class="nav">
        <a href="http://localhost:8888/rebsct-final" class="logo"><img src="http://localhost:8888/rebsct-final/images/logo-rebs.png" alt="Logo"></a>
        <div class="nav-container">
            <ul class="nav-links">
                <li><a href="http://localhost:8888/rebsct-final/who-we-are/">Who We Are</a></li>
                <li><a href="http://localhost:8888/rebsct-final/our-mission/">Our Mission</a></li>
                <li><a href="http://localhost:8888/rebsct-final/events/">What We're Up To</a></li>
                <li><a href="http://localhost:8888/rebsct-final/podcast/">Podcast</a></li>
                
            </ul>
        </div>
        <button class="member-btn" 
            data-tally-open="wQ4dvY"
            data-tally-layout="modal"
            data-tally-emoji-animation="none" 
            style="cursor:pointer;">
        Become a Member</button>
        <div class="hamburger" onclick="toggleMenu()">
            <div></div>
            <div></div>
            <div></div>
        </div>
    </nav>

    <div class="mobile-menu">
        <a href="http://localhost:8888/rebsct-final/who-we-are/">Who We Are</a>
        <a href="http://localhost:8888/rebsct-final/our-mission/">Our Mission</a>
        <a href="http://localhost:8888/rebsct-final/events/">What We're Up To</a>
        <a href="http://localhost:8888/rebsct-final/podcast/">Podcast</a>
         <div data-tally-open="wQ4dvY"
        data-tally-layout="modal"
        data-tally-emoji-animation="none" 
        style="cursor:pointer;width:100%;">Become a Member</div>
    </div>

    <script>
    function toggleMenu() {
        const mobileMenu = document.querySelector(".mobile-menu");
        const hamburger = document.querySelector(".hamburger");
    
        mobileMenu.classList.toggle("active");
        hamburger.classList.toggle("active");
}
    </script>

