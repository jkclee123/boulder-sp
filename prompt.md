react web app with firebase auth, hosting, firestore and firebase functions
1. the app is named "Boulder SP"
2. all timezone use hong kong time
3. all currency is in hong kong dollar
4. privatePass created by adminPass has lastDay calculated by adding transferred date (createdAt) and duration, not related to adminPass's lastDay
5. payments are not handled by web app, the web app simply redirect users to telegram to discuss payment
6. multiple marketPass can reference the same privatePass
7. normal user will be routed to market page when logged in
8. admin user will be routed to admin page when logged in
9. records will not be deleted, only de-activate to not show in UI
10. user purchase admin pass, admin pass transferred as private pass, createdAt:August 12, 2025 at 03:00:00 PM UTC+8, duration: 7 days, lastDay should be August 19, 2025 at 23:59:59 PM UTC+8
11. user will always be routed to account page unless name and phone number is set
12. clicking on profile shows pop up with links to "account page", "my pass page" and "pass log page", "admin page" if log in user is admin

-------
collections:
- gym
- user
- privatePass
- marketPass
- adminPass 
- passLog

gym:
displayName: string
id: string

user:
createdAt: timestamp
updatedAt: timestamp
name: string
email: string
providerIds: string[]
uid: (Auth uid as doc ID)
telegramId: string (without @)
phoneNumber: string (*unique)
gymMemberId: map<string, string> (gym name to gym member id *unique)
isAdmin: boolean
adminGym: string (name of gym)

privatePass:
createdAt: timestamp
updatedAt: timestamp
gym: string (name of gym)
purchasePrice: number (total price)
(averagePrice calculated by purchasePrice/purchaseCount)
purchaseCount: number
count: number
userRef: reference to user
lastDay: timestamp
active: boolean

marketPass:
createdAt: timestamp
updatedAt: timestamp
gym: string (name of gym)
price: number (price per pass)
count: number
userRef: reference to user
privatePasRef: reference to privatePass
remarks: string
lastDay: timestamp
active: boolean

adminPass:
createdAt: timestamp
updatedAt: timestamp
count: number (do not reduce count after transfer)
gym: string (name of gym)
price: number (total price instead of price per pass)
(averagePrice calculated by price/count)
duration: number (days)
lastDay: timestamp
active: boolean

passLog:
createdAt: timestamp
gym: string (name of gym)
count: number
price: number
fromUserRef: reference to user
toUserRef: reference to user
action: string (transfer | consume)
participants: array [fromUserUid, toUserUid]
-------

UI 
- login page
- account page
- my pass page
- pass log page
- market page
- admin page

- login page
1. login page is completed

- account page
1. account page let user set their name, telegramId, phone number (8 digit number) and membershipId per gym
2. do not verify phone number

- my pass page
1. user can view their private pass, market pass, expiried pass in 3 separate list view
2. privatePass list: privatePass before lastDay filtered by user
3. marketPass list: marketPass before lastDay filtered by user
4. expiried pass list: privatePass and marketPass after lastDay and active filtered by user, show private pass with count zero but not marketPass with count zero
5. privatePass list trailing button: transfer | market
6. marketPass list trailing button: transfer | unlist
7. expiried pass list trailing button: de-activate
8. user can only view pass that belongs to them (user field in pass)
9. user can list privatePass for sale at a user chosen count and price
10. when user decides to list a privatePass of count 50 for sale with count 20, his account has a count of 30 privatePass and count of 20 marketPass
11. user must set telegramId before listing privatePass for sale
12. user can unlist a marketPass with chosen count, in this case the chosen marketPass count is merge back to its original privatePass

- admin page
1. admin can view active admin pass list that belongs to his gym (gym field in user)
2. admin can add and de-activate admin pass in this page
3. admin can transfer admin pass to normal user account as private pass
4. admin can consume pass in this page, similar to transfer, admin search for target user with phoneNumber or membershipId, check the name to see if target user is correct, and choose number of pass to consume, then the same number of private pass or market pass is consumed


- pass log pass
1. whenever a transfer or consume has complete, a pass log record is created
2. user can only view pass log where either the fromUser or toUser is the loggin user

- market page
1. shows all marketPass that are not expiried (according to lastDay) and with count > 0
2. includes a filter to filter by gym
3. trailing the list item is a button that has link "https://t.me/{owner-telegramId}?text={to-be-impleted-in-the-future}"
4. check if user has set phoneNumber before routing to telegram
5. when marketPass count goes to 0, it wont show up in the market page 

-------

Transfer process
1. transfer is handled in the "my pass page", with a transfer button trailing the pass list item
2. all private pass, market pass and admin pass can be transferred, except pass expired
3. during transfer, fromUser enter either phone number or membershipId to search for toUser
4. toUser name along side the phone number or membershipId inputed shows up for confirmation
5. fromUser can change the price and count value to be transferred
6. transferred pass are added to toUser account as privatePass
7. a new passLog is generated
8. admin pass count will not reduce after transfer, the count is always fixed

Consume process (admin only)
1. in admin page, a button named "Consume Pass", admin can only consume pass that belongs to his gym (gym field in user)
2. admin either enter phone number or membershipId to search for target user
3. target user name along side the phone number or membershipId inputed shows up for confirmation
4. admin can set the number of pass to consume
5. if the target user do not have enough private pass or market pass belonging to the admin's gym, error message pop up
6. if admin chose to consume 2 pass, where the user has one private pass and one market pass, the operation should also be error to avoid complex operation
7. private pass of that gym is consumed by default, if there is no private pass, switch to consume market pass
8. a new passLog is generated with price zero, fromUser: target user, toUser: admin user

