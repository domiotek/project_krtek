# Project Krtek

### About
Project Krtek (or eHospudka) will be a web application that will serve employees of certain Pub (hopefully). In summary, each employee will have an account and will be able to view and influence work schedule by reporting their availability, trade their shifts and more. Users will have the ability to receive notifications about important events, like posting of the new schedule. There will be more, that's just an outline.

### Current stage
Project is currently stable within the basic functionality that was scheduled for version 1.0.0. Application features basic, yet functional accounts, schedule and statististics system. Current stage allows for quite comfortable tracking of the current schedule and earnings of all of the employees.

### Roadmap

#### Phase 1 (Release 1.0.0)
Phase 1 will not be as exciting as you can expect, but it's a necessary base, that the rest will be built on.

* Schedule system - Initial design of schedule system will allow to view schedule for this and previous weeks. Schedules will probably be imported from the json file via cli service. 
* Stats system - Every employee will get automatically generated statistics about their work in the current month or week. The statistics will include the amount of shifts, hours worked, the total earned money for the month and more. 
* Widget system - Both Schedule and stats will be available on their own separate tabs, but the plan is to have a home page or a dashboard with the widgets which will present a handful of most interesting data on the front without needing to open the tab itself. For the first batch of widgets the plan is to include "Current week schedule", "My next shift", "Basic month stats" and a widget that will allow to push the shift to the database. Wait what?
* Workflow - Well, for now the way that it will work is that every employee, when the planned shift is over and they were assigned to it,  will be able to assign details to their shift, like when they started and when ended, what tip did they earn and if they have any deduction. These details will be then used to calculate the stats mentioned before.
* Admin CLI tools - additionally, which is less interesting, there is a plan to introduce the tools for the admin to manage the users, schedule and stats. Tools for the user management are already done, yay 🎉

#### Phase 2
Phase 2 gets more exciting.

* Feedback tab - I promise, it gets better, lol. Yes, basic feedback tool which I hope someone will use to propose new widgets, report any problems etc. There are things that I could not think about and are essential, so I hope this will be the tool for people to tell me stuff (anonymously if necessary)
* Full account support - All of the common account personalization and maintenance features that you would expect. It will be possible to change the password (In phase 1, you will need to logout and recover via email, sadly), and customization of the avatar.
* Improved schedule - The plan is to grant ability for the employees to provide the manager their availability for the next schedule, so that manager can create a schedule with ease. Later on, when the schedule is published employees will have the ability to exchange or trade the shifts with each other. How exactly will this work is still to be seen. 
* Improved stats - Even more stats, things like shift summary based on the day of the week or the co-worker and probably more. Surely, someone will give me ideas through feedback, surely.
* Manager tools - Basic tools for the manager like schedule composing, viewing all employees along with the amount of worked shifts and total money earned and probably more.

#### Phase 3
Even more things

* Announcements system - Manager will be able to post an announcement for everybody to see. They will even be notified. Wait, notified?
* Notifications system - Yes, notified. There is a plan to support native notifications on both windows and android devices. users will be notified about events like when new schedule is posted or there is an offer for shift exchange or when it's time to report your availability for next schedule and finally, when there is a new announcement available.
* Resources tab - There will be an resource tab available, useful especially for new employees where they will have ability to view resources prepared by manager. What will be there is yet to be talked through, but potential is there.
* Even more widgets - By now I hopefully got some ideas either myself or via feedback system about the widgets that would be nice to have. Additionally, there is a plan to make the dashboard (or home, if you like) page to be customizable, so that users could pick only widgets that interest them.
* Leaderboard and badges - Employee of the month, thinks like that, to be addressed later.

That's the whole roadmap as of now. There can and probably will be more, maybe some things will get moved between phases, will see. That's just an initial outline of what I plan. The first version is meant to be released as fast I can physically can, then features from **Phase 2** will be released not long after, probably not as one version but rather more. Same goes with features from **Phase 3**. There probably will be also a system of beta or preview program, where new features will be released earlier and tested before the public general release. 


### Technical details
Server is based on a **FramAPI** created by me which is then based on **fastify** and **socket.io**  servers. It servers a **SPA** type application written in **React.js**. Whole project is maintained with the types in mind, using **typescript**.
To work properly server requires additional services like:
* MySQL server - to host and operate database.
* Mailtrap API access - to send mails to the users.
* Either S3 compatible storage server or stateful main server - for storing logs and other persistent things (maybe user uploads in future?).

#### To build and run server

1. Install all dependencies using:
	`npm i`
2. Build and run server with either:
	`npm run start-dev` if you want to develop.
	or 
	`npm start` if you just want to run the server.