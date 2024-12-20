# Capstone: Lutron Floor Plan

A multi-collaborative application where users can upload floor plans (ceiling plans) and annotate it with other users in real-time using stamps / icons (representing sensors, shades, light fixtures, etc). 

### **Tech Stack:** 
- Front-End: Next.js, React, TypeScript
- Back-End: Firebase, Socket.IO, Express
- Testing: Cypress, Jest
- Libraries: Fabric.js, react-pdf

## Features
- Users can upload, delete, rename, and share floorplans
- User can use drawing tools to annotate a floorplan with devices and controls to create a system layout.
- Multi-user experience wherein any updates made to the floorplan is instantly visible on all users’ floorplans (i.e., the state of the floorplan is synchronized across all users currently looking at it).
- User can export an annotated floorplan
- Unit & integration tested using modern web project best practices (e.g., Jest, Cypress, etc.)

## Website Look
| Login View  |
| ------------- |
|![image](https://github.com/user-attachments/assets/26ab416e-4b70-46d5-85cb-85b5152f7a11)

| Home View | 
| ------------- |
|![image](https://github.com/user-attachments/assets/bd2f2c92-2a22-4c95-aaa2-c402e1494bd1)

| Editor View  | 
| ------------- | 
|![image](https://github.com/user-attachments/assets/4e29c106-a128-42df-8094-1ddca93f6802)




## How to run application
- Run npm install to get dependencies
- Run npm run dev to start application

## How to run Cypress Tests
- Follow steps above with installing dependencies with npm i 
- Run npm run test:e2e:open to open Cypress test (this makes a Cypress pop up)
- Run npm run test:e2e:run to run Cypress test or run the tests manually in the pop up
- Make sure another instance of Lutron-floor-plan (localhost) is running with npm run dev in conjunction with Cypress running

## How to run Jest Tests
- Install Jest Runner extension on VSCode
- This will make run | debug options appear above Jest test, simplifying the process 



