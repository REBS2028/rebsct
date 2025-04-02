<?php include("../inc/head.php"); ?>


    <style>

        #events {
            list-style-type: none;
            padding: 10px;
        }

        .events {
        	text-align: left;
        }

        .event-item {
            background-color: #fff;
            border: 2px solid ;
            border-radius: 5px;
            margin-bottom: 15px;
            padding: 15px;
        }

        .event-title {
            font-size: 22px;
            font-weight: bold;
            color: #204187;
        }

        .event-time {
            font-size: 18px;
            color: #34495e;
        }

        .event-description {
            font-size: 18px;
            margin-top: 15px;
            color: #000;
        }
        .event description b {font-weight: normal;}

        .event-location {
            font-size: 18px;
            color: #e74c3c;
            margin-top: 10px;
        }


        #loadMore {
            display: block;
            margin: 20px auto;
            padding: 10px 20px;
            font-size: 16px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        #loadMore:hover {
            background-color: #204187;
        }

        #loadMore:disabled {
            background-color: #95a5a6;
            cursor: not-allowed;
        }

    </style>

<div class="container image-container">
   <img class="cropped-image" src="../images/events-hero.jpg">
   <div class="hero-overlay"><h1 class="hero-headline">What We're up To</h1></div>
</div>



<div>

    <style>
ul {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Two equal columns */
  gap: 10px; /* Adjust spacing between items */
  list-style: none;
}

li {
  list-style: none;
}
    </style>
<div class="events">
    <ul id="events"></ul>

</div>
</div>
<button id="loadMore">See More Events</button>

    <script>
        const API_KEY = "AIzaSyA4d3vhjbVlZKxLgpCTsHpH59CGOhq4s3c";  // Replace with your API Key
        const CALENDAR_ID = "f52f426ad844a7624ac149b68d7c865f6e20b8511f496f25e3cc10a2d8342483@group.calendar.google.com";  // Replace with your Public Calendar ID
        let nextPageToken = null;

        async function fetchCalendarEvents() {
            let url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${API_KEY}&timeMin=${new Date().toISOString()}&maxResults=5&singleEvents=true&orderBy=startTime`;

            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`;
            }

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.items) {
                    const eventList = document.getElementById("events");

                    data.items.forEach(event => {
                        const eventItem = document.createElement("li");
                        eventItem.classList.add("event-item");

                        const eventTitle = document.createElement("div");
                        eventTitle.classList.add("event-title");
                        eventTitle.textContent = event.summary;

                        const eventTime = document.createElement("div");
                        eventTime.classList.add("event-time");
                        const eventStart = event.start.dateTime || event.start.date;
                        const formattedDate = new Date(eventStart);

                        if (!isNaN(formattedDate.getTime())) {
                            const formattedTime = formattedDate.toLocaleString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true
                            });
                            eventTime.textContent = `${formattedTime}`;
                        } else {
                            eventTime.textContent = "No start time available";
                        }



const eventDescription = document.createElement("div");
eventDescription.classList.add("event-description");

if (event.description) {
    let formattedDescription = event.description
        .replace(/\n/g, "<br>")  // Convert new lines to <br>
        .replace(/(^|[^"'>])(https?:\/\/[^\s<>"]+)/g, '$1<a href="$2" target="_blank">$2</a>');  // Convert only plain URLs, avoid nested <a>

    eventDescription.innerHTML = formattedDescription;
} else {
    eventDescription.textContent = "No description available";
}


                        const eventLocation = document.createElement("div");
                        eventLocation.classList.add("event-location");
                        eventLocation.textContent = event.location ? `Location: ${event.location}` : " ";

                        eventItem.appendChild(eventTitle);
                        eventItem.appendChild(eventTime);
                        eventItem.appendChild(eventDescription);
                        eventItem.appendChild(eventLocation);
                        eventList.appendChild(eventItem);
                    });

                    nextPageToken = data.nextPageToken || null;

                    if (!nextPageToken) {
                        document.getElementById("loadMore").disabled = true;
                        document.getElementById("loadMore").textContent = "No More Events";
                    }
                } else {
                    document.getElementById("events").innerHTML = "No upcoming events found.";
                }
            } catch (error) {
                console.error("Error fetching calendar events:", error);
            }
        }

        document.getElementById("loadMore").addEventListener("click", fetchCalendarEvents);

        fetchCalendarEvents();
    </script>


<?php include("../inc/footer.php"); ?>