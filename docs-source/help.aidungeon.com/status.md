---
title: "Status"
source: https://help.aidungeon.com/status
scraped: 2026-11-25
---

# Status

![icon](https://app.notion.com/icons/burst_yellow.svg)

Click the link below to check out our **automatically-updating** Status page!

[

##### Latitude System Status

Real-time system status for AI Dungeon

![](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/95cdddda-22ac-4a96-b9f5-3338af9bcafa/favicon.ico?width=1600)

status.latitude.io

](http://status.latitude.io)

# Quick Guide

If there is a green dot beside a system, that means that it is functioning as normal.

If the dot is yellow, that means some systems are degraded (such as performing slower), but still functional.

Finally, if the dot is red, that means that the system is nonfunctional, and is likely being looked into by the devs.

Next to each system, you will also see a number in “ms”. This is how many milliseconds, on average, that system is taking to perform.

Different systems (models in particular) have different waiting times depending on what is typically healthy for that model—8000ms might be unusually high for one, but rather typical for another.

These numbers are calculated by looking at the average call times over the past month and comparing that average to the current average.

# Past Incidents

### Murphy’s Law (@June 13, 2025)

We’ve had a number of issues caused by bugs, vendor outages, and even Google going down. Details here: [https://www.reddit.com/r/AIDungeon/comments/1laiwou/ai\_dungeon\_outages\_a\_case\_study\_in\_murphys\_law/](https://www.reddit.com/r/AIDungeon/comments/1laiwou/ai_dungeon_outages_a_case_study_in_murphys_law/)

### Intermittent Outages (@June 6, 2025)

We’re seeing server issues. Beta may be available in the meantime at beta.aidungeon.com. Our team is investigating right now, and we’ll provide more information. Read our recent Reddit post for more info: [https://www.reddit.com/r/AIDungeon/comments/1l3npu2/recent\_outagesa\_quick\_note/](https://www.reddit.com/r/AIDungeon/comments/1l3npu2/recent_outagesa_quick_note/)

### Database Maintenance Window (@February 12, 2025)

We're planning downtime for Wednesday, February 12th at 7:00am MT. AI Dungeon will be unavailable for up to an hour.

This downtime will be used to upgrade our database to the latest version of Postgres, and to update some packages we use to maintain our database. These updates require a database restart, which will make AI Dungeon unavailable during that time.

We also expect a short period of downtime later Wednesday afternoon as we apply the updates to our adventures table. We've tested this upgrade on a test database, and it only took a few minutes, but sometimes things take longer for our production database.

Our team will be sharing updates and answering questions during these maintenance windows. Thanks for your patience as we upgrade systems to handle our continued player growth.

### Certificate Issue (@January 23, 2025)

There was an issue with Google Certificates being invalidated, causing outages to our database and Codepush, which serves our iOS and Android apps. We made a change to AI Dungeon to accelerate bringing things online while waiting for Timescale to get new certificates reissued. We were down for about 1 hour.

### Outage from a vendor of our AI vendor (@January 9, 2025)

We’re currently seeing slowness across the site that we’ve traced back to one of our AI vendors. They’ve said:

> One of our gpu vendors is experiencing network outage, it may affect your endpoints of small models. we are actively working with them to recover

This outage is having a cascading effect on other parts of our tech stack. We’re working to resolve.

### Database Limits (@December 26, 2024)

8:36 PM MST

Good news. We have found a solution that has brought AI Dungeon back to stability. We want to thank you all again for your patience while we worked to bring AI Dungeon back to full service.

We were able to work with our database provider to diagnose and address our most immediate concern—restoring service. Our provider confirmed our hypothesis that the vacuum jobs were taking up a significant number of IO operations. We'd attempted to upgrade our service, but hit a bug which they resolved for us. As a result, we were able to double our maximum IO operations. With greater resources available, the vacuum jobs were able to complete successfully, and we were able to support our full production traffic.

As of this update, the database is back to a healthy state. We've been monitoring it for a few hours, and the utilization of our IO operations has dropped back down to pre-outage levels. With our upgraded service, we're optimistic that we've seen the last of these issues for a while. Even though we've raised our maximum database IO operations, we identified several important areas to improve to further reduce our load on the database. We'll be queueing these improvements with other architecture improvements already in progress.

So now, we invite you to return to your regularly scheduled adventuring. Thanks again for being so supportive during the outage. We also want to express appreciation to our team for their hard work and sacrifice to help us restore service. We wish all of you aa happy holiday season. We're looking forward to a great 2025!

12:46 PM

Hey everyone. First of all, we're sorry for the extended issues with AI Dungeon this week. This has become an unusual situation for us, and we're doing our best to diagnose and resolve the issues.

As we fight through the lack of sleep and canceled holiday plans, our team has been touched and grateful for the outpouring of support and love you've shared with us. We've received countless messages of encouragement and understanding. All of you have the right to be frustrated (we sure are), and we feel incredibly lucky to have a community that is cheering for us, even during downtimes. It only adds fuel to our motivation to get things back online as soon as we can.

Here's what we know right now. As we shared previously, we're hitting the limits of our database provider, but at this point, it's not clear whether this is an issue caused by us or our provider. For instance, during moments when we've had AI Dungeon traffic completely shut down, our database metrics have still shown high utilization of resources. Right now, our leading theory is that there are issues with database vacuum jobs (which run automatically to clean up and optimize database performance). Since we're using a managed service for our database, we don't have direct visibility or control over those processes. Whatever issues there are, the increased traffic over the holidays only adds to the database load (which is a great problem to have).

We're already in communication with our database provider and doing everything we can to accelerate the support we are getting. We've also paid to increase database resources, but that intervention didn't work the way it was supposed to (again, our database provider is looking into that issue as well).

Currently, Beta is online and working, so we encourage players to switch to beta for now by visiting [beta.aidungeon.com](https://beta.aidungeon.com/). If you typically use the mobile apps, we suggest switching to a browser for now so you can access the beta environment.

Once the immediate issues are resolved, we'll be turning our attention back to long term architecture improvements. We're already working on projects that we think will directly help with our database load.

We'll continue to do everything we can to resolve these outages and share updates when we have them. This has turned into a complex situation, and the theories we've shared here may end up being wrong as we gather more information.

Once again, we're sorry that AI Dungeon hasn't been available for you as much as we'd like it to be. We'll be giving this full attention until we're able to restore service. We appreciate all of you and wish you all a happy holiday season!

As we mentioned recently, we’ve been hitting the limits of our provider. This happened again today. We’re restarting the database to apply different rules that we hope will result in reduced load and improved reliability.

We expect things to be back online shortly.

### Hit Max Database Limit (@December 22, 2024)

We posted a longer writeup about this outage here: [click to read.](https://help.aidungeon.com/faq/next-steps-to-address-recent-slowness-and-outages-dec-2024)

### Partial Outage—Server Crashes (@September 13, 2024)

@September 13, 2024 4:12 PM (EDT) Weʻre seeing a partial outage right now. Our team is investigating. We believe we understand the source of the outage and are working on resolving. Weʻll share more updates as we confirm the source of the issue.

@September 13, 2024 5:00 PM (EDT) Several servers crashed and caused a full to partial outage for players. Our team intervened and was able to get the servers started again.

### iOS and Android Apps not loading (@September 12, 2024 8:13 AM (MDT))

Since early today, Microsoft CodePush has been down. This prevented the AI Dungeon app from loading. Our [new app release](https://www.reddit.com/r/AIDungeon/comments/1ffdcgv/patch_notes_prod_91224_new_app_release_1272/) will better handle the case when CodePush is down as a service.

@September 12, 2024 12:14 PM (EDT) Verified that this is an outage with our app update provider. Waiting for that service to come back online while also preparing a potential bypass if it doesn’t come back online in the next 24 hours.

@September 12, 2024 6:32 PM (EDT) New native release deployed for Android that allows bypass of codepush when there is a network error.

@September 12, 2024 6:33 PM (EDT) Codepush is still seeing intermittent issues, but it mostly back online. We can call the issue resolved now as the issue can be worked around by reloading the app in most cases.

### Database partial outage (@August 29, 2024)

@August 29, 2024 5:53 PM (MDT) Database partial outage causing AI Dungeon Servers to crash resulting in about 50% downtime.

@August 29, 2024 8:08 PM (MDT) Interventions have helped to stabilize servers a bit. Still seeing about 25% downtime.

@August 29, 2024 8:18 PM (MDT) Further interventions have stabilized the database resulting in stable servers again. Back to 100%.

### Beta + Production Down (@June 15, 2024)

@June 15, 2024 6:35 AM (MDT) Servers have recovered

@June 15, 2024 6:19 AM (MDT) We’re seeing a full outage for beta and production servers.

### MythoMax Outage (@June 6, 2024)

@June 6, 2024 1:05 AM (MDT) Failed over the 0.19 version to the 0.1 version

@June 6, 2024 12:46 AM (MDT) Specifically MythoMax version 0.19 is down, version 0.1 is working.

@June 6, 2024 12:24 AM (MDT) We’re currently having issues with the MythoMax model.

### Prod Server outage (@May 30, 2024)

8:15pm PST—We’re seeing an outage on Production. The team is investigating.

8:27pm PST—The servers seem to have recovered. We’ll continue to monitor.

### Database Upgrade (@May 25, 2024)

7:50am PST—Database upgrade is complete and servers are recovering.

7:40am PST—We are currently upgrading our database to support increased player demand.

### Database Provider Issues Causing Outage (@May 21, 2024)

11:08am PST—Our interventions have been successful and we’re seeing recovery on all platforms. Let us know if you have additional issues.

10:35am PST—We discovered our database provider is having degraded service right now **[https://status.timescale.com/](https://status.timescale.com/)**

10:29am PST—Our alert systems have indicated that all model requests have failed. Our team is investigating and looking into it.

### Partial Server Outage (@May 16, 2024)

We're seeing a partial outage right now due to an error that happened with our database provider. We're seeing things recovering, but might take more time before everyone is back online.

### Partial Server Outage (@September 20, 2023 → September 21, 2023)

We had a 12-hour partial server outage that started at 7pm MT (UTC-6) September 20, 2023. The outage seemed to be caused by a redirect problem with the profile page. Our devs looked at things early morning September 21, 2023 and solved the issue with both a dyno increase and some bug fixes throughout the day.

### Server + Database Instability (@August 21, 2023)

Given the turbulence of the weekend, we temporarily scaled up our server capacity to avoid further issues. This morning, we encountered problems when auto-scale was turned back on, but we worked with Azure to resolve the issue.

Additionally, a small number of users may be experiencing database connection issues. This is a separate problem stemming from our vendor, Timescale. We are still determining the root cause of this issue, but we have a mitigating solution in place for the interim.

### Intermittent Server Outages (@August 19, 2023 → August 20, 2023)

AI Dungeon Legacy experienced intermittent server issues over the weekend. We reached out to Azure, our new server provider, and they helped us find the root cause of these problems: we were hitting the limit for SNAT ports available. This bug likely caused a number of outages in the past, and our devs have now determined a long-term fix.

### Database Outage (@July 17, 2023)

3:54pm MT: AI Dungeon is current down due to a database outage. We have contacted the provider and are working with them to restore service.

4:14pm MT: Timescale was able to restore service. We are following up with them to figure out what caused this outage.

### Timescale database failure (@July 8, 2023)

Our database provider failed during an auto-scale process. The incident resulted in a long outage because the fix required a full database migration to a different infrastructure.

### Coreweave Partial Outage (@June 16, 2023)

One of our Coreweave pods that hosts our GPT-J model failed, causing a partial outage for players using our Griffin model. We were able to reset the server and restore service to normal.

### Heroku Redis Upgrade (@June 16, 2023)

Starting at 4:08am MT A Heroku Redis auto upgrade lead to a conflict that prevented the AI Dungeon API from serving requests leading to an outage on production AI Dungeon. at 4:52am MT we discovered the fix for the issue and deployed a fix.

### Timescale Maintenance Issue (@May 30, 2023)

Starting at 12:38am MT, our database provider restarted our database as a part of planned maintenance. While this should have only taken a few minutes, we had a full outage until 1:37am MT when the database came fully back online.

From Timescale:

> We were doing maintenance in our clusters to make TSDB 2.11 available to all customers. While we were doing that, we were restarting all customer instances during their preconfigured maintenance window. In addition to that we were upgrading software on the nodes where customer databases are running. We usually keep some spare nodes to accommodate the customer instances after they are restarted. Spare nodes were not created in our clusters in a timely manner this time because AWS couldn’t provide us with enough nodes of the requested size, which caused your database instance to wait longer until it was created. We’ve taken measures to ensure, that spare nodes are available in the cluster and this shouldn’t happen further.

We have a larger upgrade in coordination with our database provider that should be completed this summer, which will ensure these types of issues don't happen in the future.

### Heroku Connection Errors (@May 13, 2023)

Starting at 6:00am MDT we saw intermittent connection errors that were causing around 50% of connections to fail on the AI Dungeon API. After attempting our own restart and seeing no progress, we contacted Heroku, who we use to host the Latitude API. They responded and the issue was resolved by 6:57am MDT.

We’ve followed up with the Heroku team since this is tracking with 2 other issues Heroku had in the last 24 hours.

### High Database CPU Causing Partial Outage (@April 6, 2023)

We experienced high CPU load today that caused a partial outage. The issue was quickly detected and resolved, and the outage only lasted a few minutes. We’ll continue to monitor for unexpected behavior.

### 5-minute Outage (@March 20, 2023)

We experienced a brief downtime this morning due to an error on our end. Our team identified and resolved the problem quickly, and AI Dungeon was down for approximately 5 minutes.

### Timescale Database Outage (@March 14, 2023)

### 10:13am MDT—Service Restored

The intervention seems to have resolved the outage we experienced today. All systems appear to be online once again. We’ll continue to monitor for any unexpected behaviors. Please let us know if you experience any issues by emailing us at support@aidungeon.io or on our [Discord server](https://discord.gg/2xvD2EhH8e).

### 8:40am MDT—Outage Update

AI Dungeon is currently experiencing a full outage due to issues with our database hosting provider. Our team has identified an intervention that should resolve the issue, and is currently working the vendor support team to resolve. The current estimate for service restoration is approximately 3 hours.

### 8:13am MDT—Database outage

We’re currently experiencing a partial outage caused by a partial outage from our database hosting provider. The team is working to resolve. There may be periods of full outages as we work to reset our systems.

### Heroku Network Errors Partial Outage (@February 15, 2023)

Our server provider, Heroku, had network issues related to our cluster. They began around 12:17 PM Mountain Time on @February 15, 2023. We were alerted about lower traffic on our models at 12:42 PM and restarted the cluster to clear up the issue by 12:57 PM.

We continue to work with Heroku to limit the impact of these outages for our player base. We have increased the sensitivity of our own alerting system so that we find the issue sooner if it does occur again.

### Coreweave Partial Outage (Griffin) (@January 17, 2023)

Coreweave (the provider we host Griffin on) is having some performance issues they recently alerted us about. We are monitoring and will update when performance returns to full. Until then some players may have technical issues for some generations.

### Heroku Slowdowns (@December 14, 2022)

We are currently looking into some model slow downs. We are reaching out to Heroku which seems to be the cause of the issues.

### Heroku Outage (@December 8, 2022)

### December 8, 2022 7:18pm MST

Heroku service has been restored and AI Dungeon should be back to online status.

### December 8, 2022 5:51pm MST

Heroku has issued an update on the outage. They have identified the cause of the outage and are working on a fix. They said they will provide an update within 30min.

### December 8, 2022 5:28pm MST

The outage seems to be caused by a [Heroku outage](https://status.heroku.com/incidents/2479). We use Heroku to host portions of AI Dungeon. We’ll update the community when service is restored.

### December 8, 2022 4:46pm MST

We’re experiencing a 90% outage across the app. Our team is aware of the issue and is diagnosing the problem.

### Heroku Outage (@November 30, 2022)

> 11/30/22 4:11 pm MT We were alerted that AI Dungeon was down for 80% of players for about 20 minutes due to an upstream issue with one of our tech providers. The issue is recovering on its own and should be resolved shortly. 11/30/22 4:16 pm MT It appears all systems are once again operating at full capacity.

Description of the incident.

### Timescale Database Partial Outage (@November 13, 2022)

11/13/22 4:29 pm MT We are looking into a partial outage on AI Dungeon. Currently diagnosing increased 500 errors in the Latitude API Update 4:37 pm MT We got the server and database back to good health and are diagnosing the cause of the hiccups. We will continue to monitor.

### Heroku Intermittent Outage with AI Dungeon API (@September 16, 2022 - @September 22, 2022 )

The Heroku instance running our AI Dungeon API has had intermittent issues since last Friday that keep recurring. The team is digging into why this is happening and working to mitigate. We have reached out to Heroku for more information about the behavior we’re seeing.

> Healthy moving forward, but previously have had intermittent issues with the servers running our AI Dungeon API @September 20, 2022: The Heroku instance running our AI Dungeon API has had intermittent issues since last Friday that keep recurring. The team is digging into why this is happening and working to mitigate. We have reached out to Heroku for more information about the behavior we’re seeing. Update @September 21, 2022: We've identified the intermittent issues this past week as a Heroku open connections limit we have been hitting (even using their largest plan). AI Dungeon is now healthy given Heroku allowing us to bypass their normal limits. I will share more details tomorrow as we finalize the fix.

### Action Counts Off + Griffin Outage (@August 25, 2022)

Description of the incident.

And we had another outage (a combination of database and then Coreweave instances going down). Action counts were off for a bit and ads were behaving oddly. We're awarding 200 actions to any impacted players.

Actions moving forward include a retro with the team and open conversation with Coreweave about how we build more resilience into the pod cluster, even with high traffic volumes.

### Coreweave Outage (Griffin) (@August 25, 2022)

Our Griffin Pods had issues that didn’t recover even with a restart. Coreweave was able to help us successfully get the pods back online. We'll be working with them to figure out what caused this and how to avoid similar outages in the future.

### Database Performance Issues (@August 25, 2022)

9:00 am: Some users are experiencing lag. We are currently digging in. 9:11 am: We've identified the issue related to database performance and are working on a fix. 9:58 am: A fix has been pushed by rolling back a change we made related to the upcoming gold system and scales changes. We will be adjusting given the performance issues before we push this again.

### Heroku Outage (@August 23, 2022)

We had intermittent network issues due to an [outage](https://status.heroku.com/incidents/2453) with one of our core providers, Heroku.

### AI Art temporary outage (@August 16, 2022)

Pixray, Disco Diffusion, and VQgan were temporarily unavailable due to a service outage.

### Heroku Outage (@August 15, 2022)

Our hosting provider had an outage that cause about 30 minutes of downtime and 20 minutes of degraded performance.

### Coreweave Outage (@August 12, 2022)

One of our AI infrastructure partners, Coreweave, had an outage today that impacted us and other AI experiences. Griffin was unable to generate for 20 minutes because of this outage. We contacted the company and they quickly resolved the issue.

### Partial Android App Outage (@August 7, 2022 )

Version 153 of the Android App is installing but the icon isn’t showing for some Android devices. If you haven’t upgraded we invite you not to. We have a new build already waiting on Google to review that a developer worked on late last night.

This was caused by a relatively small package upgrade that worked in local testing but caused an issue with certain devices in production deployment for Google. Frankly we were surprised by this one since Google review is supposed to catch stuff like this which we can’t test without pushing live. We’ve contacted them to expedite this review and looked into any options for rolling back.

Apologies. We will update here once the new version is live. Android players experiencing this issue can play using their mobile browser as an interim solution.

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/b92f6085-c518-444a-b404-e7a6dd419694/ic_round-discord.svg)

Remember that you can always get more information on this, or any subject, by asking on [our official Discord Server](https://aidungeon.com/discord).
