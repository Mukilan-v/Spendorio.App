/**
 * storage.js - Data Layer for Daily Routine Task & Cost Management System
 */

const STORAGE_KEYS = {
  TASKS: 'taskcost_tasks',
  EXPENSES: 'taskcost_expenses',
  INCOMES: 'taskcost_incomes',
  BUDGET: 'taskcost_budget',
  SETTINGS: 'taskcost_settings',
  STREAKS: 'taskcost_streaks'
};

const DEFAULT_SETTINGS = {
  currency: '₹',
  currencyCode: 'INR',
  theme: 'light',
  dailyBudget: 2000,
  monthlyBudget: 50000,
  categoryBudgets: {
    'Food & Dining': 10000,
    'Transportation': 5000,
    'Groceries & Household': 5000,
    'Bills & Utilities': 15000,
    'Fitness & Health': 3000,
    'Learning & Work': 45000,
    'Entertainment & Leisure': 3000,
    'Shopping & Others': 5000
  }
};

// Seed user expenses, incomes and daily routines
function getInitialSeedData() {
  const today = '2026-09-01';

  const tasks = [
    {
      id: 'task-1',
      title: 'Morning PG Wakeup & Fresh Up',
      timeBlock: 'morning',
      time: '06:30',
      category: 'Fitness & Health',
      priority: 'high',
      isRoutine: true,
      cost: 0,
      completed: true,
      date: today,
      notes: 'Morning routine'
    },
    {
      id: 'task-2',
      title: 'Eggs (10 pcs) & Curd Breakfast',
      timeBlock: 'morning',
      time: '08:00',
      category: 'Groceries & Household',
      priority: 'medium',
      isRoutine: true,
      cost: 80,
      completed: true,
      date: today,
      notes: 'Eggs: ₹65 + Curd: ₹15'
    },
    {
      id: 'task-3',
      title: 'Besant Technologies Tech Training & Practice',
      timeBlock: 'afternoon',
      time: '10:30',
      category: 'Learning & Work',
      priority: 'high',
      isRoutine: true,
      cost: 0,
      completed: true,
      date: today,
      notes: 'Class lectures and hands-on coding exercises'
    },
    {
      id: 'task-4',
      title: 'Afternoon Lunch & Tea',
      timeBlock: 'afternoon',
      time: '13:30',
      category: 'Food & Dining',
      priority: 'medium',
      isRoutine: false,
      cost: 0,
      completed: true,
      date: today,
      notes: 'PG Lunch'
    },
    {
      id: 'task-5',
      title: 'Evening Coding Study & Projects',
      timeBlock: 'evening',
      time: '18:00',
      category: 'Learning & Work',
      priority: 'high',
      isRoutine: true,
      cost: 0,
      completed: false,
      date: today,
      notes: 'Practice Java Fullstack / Python & ML modules'
    },
    {
      id: 'task-6',
      title: 'Dinner & Expense Review',
      timeBlock: 'night',
      time: '21:00',
      category: 'Food & Dining',
      priority: 'medium',
      isRoutine: true,
      cost: 0,
      completed: false,
      date: today,
      notes: 'Daily routine checklist review'
    }
  ];

  const expenses = [
  {
    "id": "exp-1792744523438-126",
    "createdAt": "2026-10-23T08:35:23.438Z",
    "amount": 3000,
    "title": "Amma Dress",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-10-23",
    "notes": "Amma"
  },
  {
    "id": "exp-1792659288403-796",
    "createdAt": "2026-10-22T08:54:48.403Z",
    "amount": 33,
    "title": "Eggs",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-21",
    "notes": "Myself ,Eggs 5"
  },
  {
    "id": "exp-1792646197136-83",
    "createdAt": "2026-10-22T05:16:37.136Z",
    "amount": 297,
    "title": "Reacharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-21",
    "notes": "Myself"
  },
  {
    "id": "exp-1792496816039-650",
    "createdAt": "2026-10-20T11:46:56.040Z",
    "amount": 1041,
    "title": "Cylinder",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-20",
    "notes": "Amma"
  },
  {
    "id": "exp-1792307767495-774",
    "createdAt": "2026-10-18T07:16:07.495Z",
    "amount": 58,
    "title": "Many Snacks",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-18",
    "notes": "Myself , Snacks"
  },
  {
    "id": "exp-1792307694776-958",
    "createdAt": "2026-10-18T07:14:54.776Z",
    "amount": 7500,
    "title": "PG OCT Month Fees",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-18",
    "notes": "Myself , OCT Month"
  },
  {
    "id": "exp-1792216439644-252",
    "createdAt": "2026-10-17T05:53:59.644Z",
    "amount": 100,
    "title": "Appa Food",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-17",
    "notes": "Appa"
  },
  {
    "id": "exp-1792078886782-55",
    "createdAt": "2026-10-15T15:41:26.782Z",
    "amount": 1999,
    "title": "Grameen",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-15",
    "notes": "Amma"
  },
  {
    "id": "exp-1791909211978-414",
    "createdAt": "2026-10-13T16:33:31.978Z",
    "amount": 33,
    "title": "Egg",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-13",
    "notes": "Myself Egg 6"
  },
  {
    "id": "exp-1791794767114-803",
    "createdAt": "2026-10-12T08:46:07.114Z",
    "amount": 9500,
    "title": "Dharshini Mess fees",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-12",
    "notes": "Dharshini Oct month"
  },
  {
    "id": "exp-1791794730259-690",
    "createdAt": "2026-10-12T08:45:30.259Z",
    "amount": 100,
    "title": "hair cut",
    "category": "Fitness & Health",
    "paymentMethod": "UPI",
    "date": "2026-10-12",
    "notes": "My"
  },
  {
    "id": "exp-1791527551678-438",
    "createdAt": "2026-10-09T06:32:31.678Z",
    "amount": 44,
    "title": "Snacks",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-09",
    "notes": "Me"
  },
  {
    "id": "exp-1791527527641-619",
    "createdAt": "2026-10-09T06:32:07.641Z",
    "amount": 80,
    "title": "Detergent",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-10-09",
    "notes": "1 kg, Myself"
  },
  {
    "id": "exp-1791442913564-532",
    "createdAt": "2026-10-08T07:01:53.564Z",
    "amount": 59,
    "title": "C.Briyani",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-08",
    "notes": "Lunch, Myself"
  },
  {
    "id": "exp-1791435556256-544",
    "createdAt": "2026-10-08T04:59:16.256Z",
    "amount": 1500,
    "title": "Amma",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-10-08",
    "notes": "Amma"
  },
  {
    "id": "exp-1791435517113-275",
    "createdAt": "2026-10-08T04:58:37.113Z",
    "amount": 10,
    "title": "Snacks",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-06",
    "notes": "me"
  },
  {
    "id": "exp-1791214830486-576",
    "createdAt": "2026-10-05T15:40:30.486Z",
    "amount": 5800,
    "title": "NEET Titution Fess",
    "category": "Learning & Work",
    "paymentMethod": "UPI",
    "date": "2026-10-04",
    "notes": "Dharshini"
  },
  {
    "id": "exp-1791009776176-66",
    "createdAt": "2026-10-03T06:42:56.176Z",
    "amount": 220,
    "title": "Appa",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-10-03",
    "notes": "Appa"
  },
  {
    "id": "exp-1791009732122-917",
    "createdAt": "2026-10-03T06:42:12.122Z",
    "amount": 25,
    "title": "Shamboo,plate",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-10-02",
    "notes": "My"
  },
  {
    "id": "exp-1790930369111-94",
    "createdAt": "2026-10-02T08:39:29.111Z",
    "amount": 87,
    "title": "My food",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-10-02",
    "notes": "Chicken Briyani"
  },
  {
    "id": "exp-1790917917564-684",
    "createdAt": "2026-10-02T05:11:57.564Z",
    "amount": 1000,
    "title": "Amma week Kulu",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-02",
    "notes": "Amma"
  },
  {
    "id": "exp-1790874430778-75",
    "createdAt": "2026-10-01T17:07:10.778Z",
    "amount": 52,
    "title": "Petrol",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-10-01",
    "notes": "Share, Myself"
  },
  {
    "id": "exp-1790874392395-560",
    "createdAt": "2026-10-01T17:06:32.395Z",
    "amount": 295,
    "title": "Recharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-01",
    "notes": "Amma"
  },
  {
    "id": "exp-1790874354529-309",
    "createdAt": "2026-10-01T17:05:54.529Z",
    "amount": 1999,
    "title": "amma grammin",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-01",
    "notes": "Amma"
  },
  {
    "id": "exp-1790841784226-598",
    "createdAt": "2026-10-01T08:03:04.226Z",
    "amount": 299,
    "title": "Recharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-10-01",
    "notes": "Appa phone"
  },
  {
    "id": "exp-1790785683480-72",
    "createdAt": "2026-09-30T16:28:03.480Z",
    "amount": 39,
    "title": "Egg",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-30",
    "notes": "egg 6, Myself"
  },
  {
    "id": "exp-1790785649665-383",
    "createdAt": "2026-09-30T16:27:29.665Z",
    "amount": 10,
    "title": "Ice cream",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-30",
    "notes": "my"
  },
  {
    "id": "exp-1790585481977-404",
    "createdAt": "2026-09-28T08:51:21.977Z",
    "amount": 180,
    "title": "Recharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-28",
    "notes": "Dharshini Recharege Neet"
  },
  {
    "id": "exp-1790585434443-332",
    "createdAt": "2026-09-28T08:50:34.443Z",
    "amount": 5000,
    "title": "Besant Fess",
    "category": "Learning & Work",
    "paymentMethod": "UPI",
    "date": "2026-09-28",
    "notes": "2nd term fees, Myself"
  },
  {
    "id": "exp-1790515009913-922",
    "createdAt": "2026-09-27T13:16:49.913Z",
    "amount": 33,
    "title": "Egg",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-26",
    "notes": "5 Eggs, Myself"
  },
  {
    "id": "exp-1790514923898-526",
    "createdAt": "2026-09-27T13:15:23.898Z",
    "amount": 60,
    "title": "Petrol",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-26",
    "notes": "Petrol Share, Myself"
  },
  {
    "id": "exp-1790349207012-846",
    "createdAt": "2026-09-25T15:13:27.012Z",
    "amount": 1000,
    "title": "Give amt Amma",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-25",
    "notes": "Amma"
  },
  {
    "id": "exp-1789990830694-231",
    "createdAt": "2026-09-21T11:40:30.694Z",
    "amount": 25,
    "title": "Petrol",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-21",
    "notes": "share, Myself"
  },
  {
    "id": "exp-1789990790859-905",
    "createdAt": "2026-09-21T11:39:50.859Z",
    "amount": 299,
    "title": "Recharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-20",
    "notes": "My Recharge"
  },
  {
    "id": "exp-1789990742210-276",
    "createdAt": "2026-09-21T11:39:02.210Z",
    "amount": 33,
    "title": "Egg",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-19",
    "notes": "5 egg, Myself"
  },
  {
    "id": "exp-1789746368477-481",
    "createdAt": "2026-09-18T15:46:08.477Z",
    "amount": 9500,
    "title": "Dharshini Hostel Rent",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-18",
    "notes": "Hostel"
  },
  {
    "id": "exp-1789651824863-506",
    "createdAt": "2026-09-17T13:30:24.863Z",
    "amount": 86,
    "title": "face wash",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-09-17",
    "notes": "himalaya for me"
  },
  {
    "id": "exp-1789651795586-374",
    "createdAt": "2026-09-17T13:29:55.586Z",
    "amount": 3500,
    "title": "PG sept month",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-17",
    "notes": "2nd term Sept month, Myself"
  },
  {
    "id": "exp-1789535510346-807",
    "createdAt": "2026-09-16T05:11:50.346Z",
    "amount": 50,
    "title": "petrol",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-16",
    "notes": "share, Myself"
  },
  {
    "id": "exp-1789535478483-115",
    "createdAt": "2026-09-16T05:11:18.483Z",
    "amount": 1500,
    "title": "Amma send",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-16",
    "notes": "Amma"
  },
  {
    "id": "exp-1789203788566-858",
    "createdAt": "2026-09-12T09:03:08.566Z",
    "amount": 40,
    "title": "Eggs",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-12",
    "notes": "6 EGGS, Myself"
  },
  {
    "id": "exp-1789203753924-841",
    "createdAt": "2026-09-12T09:02:33.924Z",
    "amount": 50,
    "title": "Chicken 65",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-12",
    "notes": "100g, Myself"
  },
  {
    "id": "exp-1789195112989-796",
    "createdAt": "2026-09-12T06:38:32.989Z",
    "amount": 60,
    "title": "Petrol",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-11",
    "notes": "share, Myself"
  },
  {
    "id": "exp-1788888421317-690",
    "createdAt": "2026-09-08T17:27:01.317Z",
    "amount": 86,
    "title": "Case back cover",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-09-07",
    "notes": "Iphone 11, Myself"
  },
  {
    "id": "exp-1788888323811-474",
    "createdAt": "2026-09-08T17:25:23.811Z",
    "amount": 60,
    "title": "Petrol",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-07",
    "notes": "Share petrol, Myself"
  },
  {
    "id": "exp-1788676930945-754",
    "createdAt": "2026-09-06T06:42:10.945Z",
    "amount": 100,
    "title": "I Phone Temper",
    "category": "Entertainment & Leisure",
    "paymentMethod": "UPI",
    "date": "2026-09-05",
    "notes": "New 11, Myself"
  },
  {
    "id": "exp-1788676877764-965",
    "createdAt": "2026-09-06T06:41:17.764Z",
    "amount": 107,
    "title": "Kalasipalya Bus",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-05",
    "notes": "Up and down, Myself"
  },
  {
    "id": "exp-1788676837333-250",
    "createdAt": "2026-09-06T06:40:37.333Z",
    "amount": 40,
    "title": "Ice Cream",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-05",
    "notes": "My self"
  },
  {
    "id": "exp-1788544099009-143",
    "createdAt": "2026-09-04T17:48:19.009Z",
    "amount": 50,
    "title": "Send money Appa",
    "category": "Transportation",
    "paymentMethod": "UPI",
    "date": "2026-09-04",
    "notes": "Appa"
  },
  {
    "id": "exp-1788544069675-206",
    "createdAt": "2026-09-04T17:47:49.675Z",
    "amount": 47,
    "title": "Pizza",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-04",
    "notes": "Food share offer, Myself"
  },
  {
    "id": "exp-1788455921819-508",
    "createdAt": "2026-09-03T17:18:41.819Z",
    "amount": 4000,
    "title": "PG RENT Sep",
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "date": "2026-09-01",
    "notes": "Partial, Myself"
  },
  {
    "id": "exp-1788455745731-606",
    "createdAt": "2026-09-03T17:15:45.731Z",
    "amount": 129,
    "title": "Loundry dress Bag",
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "date": "2026-09-03",
    "notes": "My self"
  },
  {
    "id": "exp-1788455692273-60",
    "createdAt": "2026-09-03T17:14:52.273Z",
    "amount": 299,
    "title": "Reacharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-03",
    "notes": "Amma Recharege"
  },
  {
    "id": "exp-1788441359690-534",
    "createdAt": "2026-09-03T13:15:59.690Z",
    "amount": 1999,
    "title": "Gramien Gulu",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-03",
    "notes": "Amma"
  },
  {
    "id": "exp-1788441103689-193",
    "createdAt": "2026-09-03T13:11:43.689Z",
    "amount": 60,
    "title": "Petrol Share",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-03",
    "notes": "Stephen, Myself"
  },
  {
    "id": "exp-1788441052363-277",
    "createdAt": "2026-09-03T13:10:52.363Z",
    "amount": 141,
    "title": "Cheppal, Maggee",
    "category": "Food & Dining",
    "paymentMethod": "Debit Card",
    "date": "2026-09-03",
    "notes": "D Mart, Myself"
  },
  {
    "id": "exp-1788440990503-535",
    "createdAt": "2026-09-03T13:09:50.503Z",
    "amount": 299,
    "title": "Recharge",
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "date": "2026-09-03",
    "notes": "Appa Recharge"
  },
  {
    "id": "exp-jul-1",
    "date": "2026-07-20",
    "title": "Hair cut",
    "amount": 100,
    "category": "Fitness & Health",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Saloon haircut, Myself"
  },
  {
    "id": "exp-jul-2",
    "date": "2026-07-22",
    "title": "Grameen",
    "amount": 1999,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Grameen loan / payment, Amma"
  },
  {
    "id": "exp-jul-3",
    "date": "2026-07-28",
    "title": "Dinner",
    "amount": 120,
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": true,
    "notes": "Night dinner, Myself"
  },
  {
    "id": "exp-jul-4",
    "date": "2026-07-29",
    "title": "Electronic City Travel",
    "amount": 180,
    "category": "Transportation",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Electronic City commute, Myself"
  },
  {
    "id": "exp-aug-1",
    "date": "2026-08-05",
    "title": "Tablet / Medicines",
    "amount": 50,
    "category": "Fitness & Health",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Pharmacy tablet,, Myself"
  },
  {
    "id": "exp-aug-2",
    "date": "2026-08-05",
    "title": "Appa Mobile Recharge",
    "amount": 299,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Monthly mobile pack"
  },
  {
    "id": "exp-aug-3",
    "date": "2026-08-06",
    "title": "Amma Mobile Recharge",
    "amount": 299,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Monthly mobile pack"
  },
  {
    "id": "exp-aug-4",
    "date": "2026-08-06",
    "title": "Snacks, Egg & Noodles",
    "amount": 112,
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Evening snacks and noodles, Myself"
  },
  {
    "id": "exp-aug-5",
    "date": "2026-08-11",
    "title": "Dollar Innerwear & Vest",
    "amount": 343,
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Clothing purchase, Myself"
  },
  {
    "id": "exp-aug-6",
    "date": "2026-08-13",
    "title": "T-Shirt",
    "amount": 160,
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Casual t-shirt, Myself"
  },
  {
    "id": "exp-aug-7",
    "date": "2026-08-13",
    "title": "Soap 750g",
    "amount": 190,
    "category": "Groceries & Household",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Bath soap, Myself"
  },
  {
    "id": "exp-aug-8",
    "date": "2026-08-14",
    "title": "Shampoo, Noodles & Juice",
    "amount": 133,
    "category": "Groceries & Household",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Daily essentials, Myself"
  },
  {
    "id": "exp-aug-9",
    "date": "2026-08-15",
    "title": "PG Visit Bus Cost",
    "amount": 104,
    "category": "Transportation",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Bus travel to visit PG, Myself"
  },
  {
    "id": "exp-aug-10",
    "date": "2026-08-15",
    "title": "T-Shirts (2) & Juice",
    "amount": 488,
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "2 T-shirts + juice, Myself"
  },
  {
    "id": "exp-aug-11",
    "date": "2026-08-15",
    "title": "My Mobile Recharge",
    "amount": 299,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Self mobile monthly plan"
  },
  {
    "id": "exp-aug-12",
    "date": "2026-08-16",
    "title": "Briyani",
    "amount": 142,
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": true,
    "notes": "Sunday lunch briyani, Myself"
  },
  {
    "id": "exp-aug-13",
    "date": "2026-08-18",
    "title": "Rice & Egg",
    "amount": 75,
    "category": "Food & Dining",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Meal purchase, Myself"
  },
  {
    "id": "exp-aug-14",
    "date": "2026-08-19",
    "title": "Cable TV Recharge",
    "amount": 200,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Home cable tv recharge, Amma,"
  },
  {
    "id": "exp-aug-15",
    "date": "2026-08-20",
    "title": "Grameen",
    "amount": 2000,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Grameen payment, Amma"
  },
  {
    "id": "exp-aug-16",
    "date": "2026-08-20",
    "title": "App Data Add-on Recharge",
    "amount": 19,
    "category": "Bills & Utilities",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Data booster, Appa"
  },
  {
    "id": "exp-aug-17",
    "date": "2026-08-20",
    "title": "Dharshini Hostel & Tuition Fee",
    "amount": 30000,
    "category": "Learning & Work",
    "paymentMethod": "Net Banking",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Hostel accommodation & tuition fee"
  },
  {
    "id": "exp-aug-18",
    "date": "2026-08-26",
    "title": "Haircut",
    "amount": 100,
    "category": "Fitness & Health",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Haircut & grooming, Myself"
  },
  {
    "id": "exp-aug-19",
    "date": "2026-08-26",
    "title": "Briyani",
    "amount": 152,
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": true,
    "notes": "Lunch briyani, Myself"
  },
  {
    "id": "exp-aug-20",
    "date": "2026-08-26",
    "title": "Dharsh Alarm",
    "amount": 131,
    "category": "Shopping & Others",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Alarm clock / accessories, Dharshini"
  },
  {
    "id": "exp-aug-21",
    "date": "2026-08-29",
    "title": "PG Travel (Go & Return Home)",
    "amount": 102,
    "category": "Transportation",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Two-way bus fare, Myself"
  },
  {
    "id": "exp-aug-22",
    "date": "2026-08-29",
    "title": "PG Advance Deposit",
    "amount": 4000,
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Room security advance deposit, Myself"
  },
  {
    "id": "exp-aug-23",
    "date": "2026-08-29",
    "title": "Liquid Soap Item",
    "amount": 138,
    "category": "Groceries & Household",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Cleaning & hygiene liquid soap, Myself"
  },
  {
    "id": "exp-aug-24",
    "date": "2026-08-30",
    "title": "Pizza (Qty 4)",
    "amount": 159,
    "category": "Food & Dining",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Dinner pizza, Myself"
  },
  {
    "id": "exp-aug-25",
    "date": "2026-08-31",
    "title": "Petrol",
    "amount": 50,
    "category": "Transportation",
    "paymentMethod": "UPI",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Vehicle fuel, Myself"
  },
  {
    "id": "exp-aug-26",
    "date": "2026-08-31",
    "title": "Besant Technologies (1st Installment)",
    "amount": 10000,
    "category": "Learning & Work",
    "paymentMethod": null,
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Course fee 1st installment, Myself"
  },
  {
    "id": "exp-aug-27",
    "date": "2026-08-31",
    "title": "Bus commute to PG",
    "amount": 51,
    "category": "Transportation",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Bus ticket, Myself"
  },
  {
    "id": "exp-aug-28",
    "date": "2026-08-31",
    "title": "Tea & Juice",
    "amount": 38,
    "category": "Food & Dining",
    "paymentMethod": "Cash",
    "taskId": null,
    "isRoutineLinked": false,
    "notes": "Tea & juice break, Myself"
  },
  {
    "id": "exp-sep-1",
    "date": "2026-09-01",
    "title": "Eggs (10 pcs)",
    "amount": 65,
    "category": "Groceries & Household",
    "paymentMethod": "UPI",
    "taskId": "task-2",
    "isRoutineLinked": true,
    "notes": "Morning routine grocery, Myself"
  },
  {
    "id": "exp-sep-2",
    "date": "2026-09-01",
    "title": "Curd",
    "amount": 15,
    "category": "Food & Dining",
    "paymentMethod": "Cash",
    "taskId": "task-2",
    "isRoutineLinked": true,
    "notes": "Breakfast curd pack, Myself"
  }
];

  const incomes = [
    {
      id: 'inc-1789746596967-866',
      createdAt: '2026-09-18T15:49:56.967Z',
      amount: 1000,
      title: 'Anna ammount',
      category: 'Other',
      date: '2026-09-18',
      notes: 'anna give 3rd time ammount'
    },
    {
      id: 'inc-1',
      date: '2026-08-15',
      title: 'Anna sent money',
      amount: 1000,
      category: 'Family Support',
      notes: 'Received from Anna'
    },
    {
      id: 'inc-2',
      date: '2026-08-26',
      title: 'Anna gave money',
      amount: 1000,
      category: 'Family Support',
      notes: 'Received from Anna'
    },
    {
      id: 'inc-3',
      date: '2026-08-29',
      title: 'Received from Raj Appa',
      amount: 10000,
      category: 'Family Support',
      notes: 'Support from Raj Appa'
    }
  ];

  return { tasks, expenses, incomes };
}

class StorageManager {
  constructor() {
    this.init();
  }

  // Get current active session user
  getCurrentSessionUser() {
    try {
      const sessionData = localStorage.getItem('taskcost_session') || sessionStorage.getItem('taskcost_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.user) {
          return session.user;
        }
      }
    } catch {}
    return null;
  }

  // Check if currently active session is a Guest User
  isCurrentGuest() {
    const user = this.getCurrentSessionUser();
    return !!(user && user.isGuest);
  }

  // Strict check if active session is the genuine owner (Mukilan Viswa)
  isCurrentOwner() {
    const user = this.getCurrentSessionUser();
    if (!user) {
      // Default to owner when no auth session exists (local single-user offline fallback)
      return true;
    }
    if (user.isGuest) return false;

    const uid = (user.id || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    // STRICT OWNER IDENTIFICATION:
    // Only the real owner Mukilan Viswa has isOwner: true or username 'mukilanviswa'
    return (
      user.isOwner === true ||
      uid === 'user-mukiviswa' ||
      uname === 'mukilanviswa' ||
      uname === 'mukiviswa' ||
      email === 'mukilanviswa@gmail.com'
    );
  }

  // Purge any stale accidental copies of owner personal data inside guest storage keys
  cleanGuestStorageIfPolluted() {
    try {
      const guestExpKey = STORAGE_KEYS.EXPENSES + '_guest';
      const guestExp = localStorage.getItem(guestExpKey);
      if (guestExp) {
        const parsed = JSON.parse(guestExp);
        if (Array.isArray(parsed) && parsed.length > 5) {
          this.resetGuestDataToFresh();
        }
      }
    } catch {}
  }

  // Purge any accidental copies of owner personal data inside new non-owner registered users
  cleanNonOwnerStorageIfPolluted() {
    if (this.isCurrentOwner()) return; // Never touch owner's personal data
    const user = this.getCurrentSessionUser();
    if (!user || user.isGuest) return;

    const userId = user.id || user.username;
    const userExpKey = STORAGE_KEYS.EXPENSES + '_user_' + userId;
    const userTasksKey = STORAGE_KEYS.TASKS + '_user_' + userId;
    const userIncomesKey = STORAGE_KEYS.INCOMES + '_user_' + userId;
    const userStreaksKey = STORAGE_KEYS.STREAKS + '_user_' + userId;

    // If this non-owner's isolated key was seeded with the owner's 91 records, clean it to fresh
    const data = localStorage.getItem(userExpKey);
    if (data) {
      try {
        const exp = JSON.parse(data);
        if (Array.isArray(exp) && exp.length > 20) {
          localStorage.setItem(userExpKey, JSON.stringify([]));
          localStorage.setItem(userTasksKey, JSON.stringify([]));
          localStorage.setItem(userIncomesKey, JSON.stringify([]));
          localStorage.setItem(userStreaksKey, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
        }
      } catch {}
    }
  }

  // Reset guest trial space to 100% fresh, clean, empty slate
  resetGuestDataToFresh() {
    localStorage.setItem(STORAGE_KEYS.TASKS + '_guest', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES + '_guest', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INCOMES + '_guest', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STREAKS + '_guest', JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
  }

  // Ensure fresh empty container for non-owner registered users
  ensureUserSeedData() {
    const user = this.getCurrentSessionUser();
    if (!user || user.isGuest || this.isCurrentOwner()) return;

    const userId = user.id || user.username;
    const userExpKey = STORAGE_KEYS.EXPENSES + '_user_' + userId;
    const userTasksKey = STORAGE_KEYS.TASKS + '_user_' + userId;
    const userIncomesKey = STORAGE_KEYS.INCOMES + '_user_' + userId;
    const userStreaksKey = STORAGE_KEYS.STREAKS + '_user_' + userId;
    const userSettingsKey = STORAGE_KEYS.SETTINGS + '_user_' + userId;

    if (!localStorage.getItem(userExpKey)) {
      localStorage.setItem(userExpKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(userTasksKey)) {
      localStorage.setItem(userTasksKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(userIncomesKey)) {
      localStorage.setItem(userIncomesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(userStreaksKey)) {
      localStorage.setItem(userStreaksKey, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
    }
    if (!localStorage.getItem(userSettingsKey)) {
      localStorage.setItem(userSettingsKey, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  init() {
    // 1. Immediately purge any accidental owner personal data leaked into guest keys
    this.cleanGuestStorageIfPolluted();

    // 2. Immediately purge any accidental owner personal data leaked into new user keys
    this.cleanNonOwnerStorageIfPolluted();

    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // 3. If guest is currently logged in, ensure fresh empty data and NEVER pull server owner data
    if (this.isCurrentGuest()) {
      this.ensureGuestSeedData();
      return;
    }

    // 4. If a non-owner registered user is logged in, ensure fresh empty isolated data
    if (!this.isCurrentOwner()) {
      this.ensureUserSeedData();
      this.syncWithServer();
      return;
    }

    // 5. Main Owner data restoration & migration
    const seed = getInitialSeedData();
    let currentExpenses = [];
    try {
      const expStr = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      currentExpenses = expStr ? JSON.parse(expStr) : [];
    } catch {}

    // CRITICAL FIX: If owner currently has less than 50 expenses (e.g. accidentally overwritten by 1 test item),
    // restore the complete 91 expenses immediately so the dashboard is NEVER empty or stuck on ₹20!
    if (!Array.isArray(currentExpenses) || currentExpenses.length < 50) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(seed.tasks));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(seed.expenses));
      localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(seed.incomes));
      localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify({ currentStreak: 5, bestStreak: 14, lastActiveDate: '2026-10-22' }));
    }
    localStorage.setItem('taskcost_migrated_v2', 'true');

    // Ensure separate guest sandbox data exists
    this.ensureGuestSeedData();

    // Background sync with server for owner
    this.syncWithServer();

    // If running under file://, automatically bridge full offline data to localhost:3000 server
    if (window.location.protocol === 'file:') {
      setTimeout(() => this.pushFileToLiveServer(), 600);
    }
  }

  // Determine storage key based on active logged-in user
  getUserStorageKey(baseKey) {
    try {
      const u = this.getCurrentSessionUser();
      if (u) {
        // STRICT GUEST ISOLATION: Guest always uses dedicated _guest key
        if (u.isGuest) {
          return baseKey + '_guest';
        }

        // STRICT OWNER ISOLATION: Only the primary owner accesses baseKey (Mukilan's 91 records)
        if (this.isCurrentOwner()) {
          return baseKey;
        }

        // ANY OTHER REGISTERED USER: Strictly isolated per user ID
        const userId = u.id || u.username;
        const userKey = baseKey + '_user_' + userId;

        // Auto-initialize fresh empty container for this user
        if (!localStorage.getItem(userKey)) {
          if (baseKey === STORAGE_KEYS.STREAKS) {
            localStorage.setItem(userKey, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
          } else if (baseKey === STORAGE_KEYS.SETTINGS) {
            localStorage.setItem(userKey, JSON.stringify(DEFAULT_SETTINGS));
          } else {
            localStorage.setItem(userKey, JSON.stringify([]));
          }
        }
        return userKey;
      }
    } catch {}
    return baseKey;
  }

  // Clean, fresh empty space for Guest Users (Zero owner personal data)
  ensureGuestSeedData() {
    const guestTasksKey = STORAGE_KEYS.TASKS + '_guest';
    const guestExpensesKey = STORAGE_KEYS.EXPENSES + '_guest';
    const guestIncomesKey = STORAGE_KEYS.INCOMES + '_guest';
    
    if (!localStorage.getItem(guestTasksKey)) {
      localStorage.setItem(guestTasksKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(guestExpensesKey)) {
      localStorage.setItem(guestExpensesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(guestIncomesKey)) {
      localStorage.setItem(guestIncomesKey, JSON.stringify([]));
    }
  }

  // --- SETTINGS ---
  getSettings() {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.SETTINGS);
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  updateSettings(newSettings) {
    const current = this.getSettings();
    const merged = { ...current, ...newSettings };
    const key = this.getUserStorageKey(STORAGE_KEYS.SETTINGS);
    localStorage.setItem(key, JSON.stringify(merged));
    if (!this.isCurrentGuest()) {
      this.pushDataToServer();
    }
    return merged;
  }

  getCurrencySymbol() {
    return this.getSettings().currency || '₹';
  }

  // --- TASKS ---
  getTasks() {
    try {
      const isGuest = this.isCurrentGuest();
      const isOwner = this.isCurrentOwner();
      const key = this.getUserStorageKey(STORAGE_KEYS.TASKS);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      
      // Guest or Non-owner registered users get fresh empty array
      if (isGuest || !isOwner) {
        localStorage.setItem(key, JSON.stringify([]));
        return [];
      }

      // Seed data for owner
      const seed = getInitialSeedData();
      if (seed && seed.tasks && seed.tasks.length > 0) {
        localStorage.setItem(key, JSON.stringify(seed.tasks));
        return seed.tasks;
      }
      return [];
    } catch {
      return [];
    }
  }

  saveTasks(tasks) {
    const isGuest = this.isCurrentGuest();
    const key = this.getUserStorageKey(STORAGE_KEYS.TASKS);
    localStorage.setItem(key, JSON.stringify(tasks));
    
    // CRITICAL: A guest MUST NEVER push to server
    if (isGuest) {
      return;
    }

    if (window.markLocalUpdated) window.markLocalUpdated();
    if (window.firebaseSync && window.firebaseSync.isConfigured()) {
      window.firebaseSync.pushLocalData();
    }

    this.pushDataToServer();
  }

  getTasksByDate(dateStr) {
    const tasks = this.getTasks();
    return tasks.filter(t => t.date === dateStr || (t.isRoutine && !t.date));
  }

  addTask(task) {
    const tasks = this.getTasks();
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      completed: false,
      cost: parseFloat(task.cost) || 0,
      ...task
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);

    // If task has linked cost, auto-create matching expense
    if (newTask.cost > 0) {
      this.addExpense({
        date: newTask.date || new Date().toISOString().split('T')[0],
        title: newTask.title,
        amount: newTask.cost,
        category: newTask.category || 'Other',
        paymentMethod: 'UPI / Digital',
        taskId: newTask.id,
        isRoutineLinked: true,
        notes: `Cost linked to routine: ${newTask.title}`
      });
    }

    return newTask;
  }

  updateTask(updatedTask) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      const oldCost = tasks[index].cost;
      tasks[index] = { ...tasks[index], ...updatedTask };
      this.saveTasks(tasks);

      // Synchronize linked expense if cost changed
      if (updatedTask.cost !== oldCost) {
        const expenses = this.getExpenses();
        const expIndex = expenses.findIndex(e => e.taskId === updatedTask.id);
        if (expIndex !== -1) {
          if (updatedTask.cost > 0) {
            expenses[expIndex].amount = parseFloat(updatedTask.cost) || 0;
            expenses[expIndex].title = updatedTask.title;
            this.saveExpenses(expenses);
          } else {
            // If cost set to 0, remove linked expense
            this.deleteExpense(expenses[expIndex].id);
          }
        } else if (updatedTask.cost > 0) {
          // If no linked expense yet, create one
          this.addExpense({
            date: updatedTask.date || new Date().toISOString().split('T')[0],
            title: updatedTask.title,
            amount: updatedTask.cost,
            category: updatedTask.category || 'Other',
            paymentMethod: 'UPI / Digital',
            taskId: updatedTask.id,
            isRoutineLinked: true,
            notes: `Cost linked to routine: ${updatedTask.title}`
          });
        }
      }
      return tasks[index];
    }
    return null;
  }

  deleteTask(taskId) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    this.saveTasks(tasks);

    // Also delete linked expense
    const expenses = this.getExpenses().filter(e => e.taskId !== taskId);
    this.saveExpenses(expenses);
    return true;
  }

  toggleTaskCompletion(taskId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks(tasks);
      this.updateStreakCount(task.completed);
      return task;
    }
    return null;
  }

  // --- STREAK TRACKER ---
  getStreakCount() {
    if (this.isCurrentGuest()) {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
    }
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.STREAKS);
      const s = localStorage.getItem(key);
      if (s) return JSON.parse(s);
      if (this.isCurrentOwner()) {
        return { currentStreak: 5, bestStreak: 14, lastActiveDate: new Date().toISOString().split('T')[0] };
      }
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
    } catch {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
    }
  }

  updateStreakCount(isCompleted) {
    if (this.isCurrentGuest()) return;
    const streaks = this.getStreakCount();
    const today = new Date().toISOString().split('T')[0];
    if (isCompleted) {
      if (streaks.lastActiveDate !== today) {
        streaks.currentStreak += 1;
        if (streaks.currentStreak > streaks.bestStreak) {
          streaks.bestStreak = streaks.currentStreak;
        }
        streaks.lastActiveDate = today;
      }
    }
    const key = this.getUserStorageKey(STORAGE_KEYS.STREAKS);
    localStorage.setItem(key, JSON.stringify(streaks));
  }

  // --- EXPENSES ---
  getExpenses() {
    try {
      const isGuest = this.isCurrentGuest();
      const isOwner = this.isCurrentOwner();
      const key = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // If owner has less than 50 expenses (e.g. accidentally overwritten with 1 test item), restore seed
          if (isOwner && parsed.length < 50) {
            const seed = getInitialSeedData();
            if (seed && seed.expenses && seed.expenses.length > 0) {
              localStorage.setItem(key, JSON.stringify(seed.expenses));
              return seed.expenses;
            }
          }
          return parsed;
        }
      }
      
      // Guest or non-owner registered users get fresh empty array
      if (isGuest || !isOwner) {
        localStorage.setItem(key, JSON.stringify([]));
        return [];
      }

      // Owner gets full seed data
      const seed = getInitialSeedData();
      if (seed && seed.expenses && seed.expenses.length > 0) {
        localStorage.setItem(key, JSON.stringify(seed.expenses));
        return seed.expenses;
      }
      return [];
    } catch {
      return [];
    }
  }

  saveExpenses(expenses) {
    const isGuest = this.isCurrentGuest();
    const key = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);
    localStorage.setItem(key, JSON.stringify(expenses));

    // CRITICAL: A guest MUST NEVER push to server
    if (isGuest) {
      return;
    }

    if (window.markLocalUpdated) window.markLocalUpdated();
    if (window.firebaseSync && window.firebaseSync.isConfigured()) {
      window.firebaseSync.pushLocalData();
    }

    this.pushDataToServer();
  }

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      id: 'exp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      amount: parseFloat(expense.amount) || 0,
      ...expense
    };
    expenses.unshift(newExpense);
    this.saveExpenses(expenses);
    return newExpense;
  }

  updateExpense(updatedExpense) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => String(e.id) === String(updatedExpense.id));
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedExpense, amount: parseFloat(updatedExpense.amount) || 0 };
      this.saveExpenses(expenses);
      return expenses[index];
    }
    return null;
  }

  deleteExpense(expenseId) {
    let expenses = this.getExpenses();
    expenses = expenses.filter(e => String(e.id) !== String(expenseId));
    this.saveExpenses(expenses);
    return true;
  }

  // --- INCOMES ---
  getIncomes() {
    try {
      const isGuest = this.isCurrentGuest();
      const isOwner = this.isCurrentOwner();
      const key = this.getUserStorageKey(STORAGE_KEYS.INCOMES);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      
      // Guest or non-owner registered users get fresh empty array
      if (isGuest || !isOwner) {
        localStorage.setItem(key, JSON.stringify([]));
        return [];
      }

      // Owner gets seed data
      const seed = getInitialSeedData();
      if (seed && seed.incomes && seed.incomes.length > 0) {
        localStorage.setItem(key, JSON.stringify(seed.incomes));
        return seed.incomes;
      }
      return [];
    } catch {
      return [];
    }
  }

  saveIncomes(incomes) {
    const isGuest = this.isCurrentGuest();
    const key = this.getUserStorageKey(STORAGE_KEYS.INCOMES);
    localStorage.setItem(key, JSON.stringify(incomes));

    // CRITICAL: A guest MUST NEVER push to server
    if (isGuest) {
      return;
    }

    if (window.markLocalUpdated) window.markLocalUpdated();
    if (window.firebaseSync && window.firebaseSync.isConfigured()) {
      window.firebaseSync.pushLocalData();
    }

    this.pushDataToServer();
  }

  deleteIncome(incomeId) {
    let incomes = this.getIncomes();
    incomes = incomes.filter(i => String(i.id) !== String(incomeId));
    this.saveIncomes(incomes);
    return true;
  }

  addIncome(income) {
    const incomes = this.getIncomes();
    const newIncome = {
      id: 'inc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      amount: parseFloat(income.amount) || 0,
      ...income
    };
    incomes.unshift(newIncome);
    this.saveIncomes(incomes);
    return newIncome;
  }

  // --- CALCULATIONS & AGGREGATIONS ---
  getDaySummary(dateStr) {
    const tasks = this.getTasksByDate(dateStr);
    const expenses = this.getExpenses().filter(e => e.date === dateStr);
    const incomes = this.getIncomes().filter(i => i.date === dateStr);
    const settings = this.getSettings();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalExpense = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const routineExpense = expenses.filter(e => e.isRoutineLinked || e.taskId).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const standaloneExpense = totalExpense - routineExpense;
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    const dailyBudget = parseFloat(settings.dailyBudget) || 2000;
    const remainingBudget = dailyBudget - totalExpense;
    const budgetUsagePercent = Math.min(Math.round((totalExpense / dailyBudget) * 100), 200);

    return {
      date: dateStr,
      totalTasks,
      completedTasks,
      completionRate,
      totalExpense,
      routineExpense,
      standaloneExpense,
      totalIncome,
      netBalance: totalIncome - totalExpense,
      dailyBudget,
      remainingBudget,
      budgetUsagePercent,
      isBudgetExceeded: totalExpense > dailyBudget,
      isBudgetNearLimit: totalExpense >= dailyBudget * 0.8 && totalExpense <= dailyBudget
    };
  }

  getMonthSummary(yearMonthStr) {
    const expenses = this.getExpenses().filter(e => e.date && e.date.startsWith(yearMonthStr));
    const incomes = this.getIncomes().filter(i => i.date && i.date.startsWith(yearMonthStr));
    const settings = this.getSettings();

    const totalExpense = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const monthlyBudget = parseFloat(settings.monthlyBudget) || 50000;

    // Category breakdown
    const categoryTotals = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    return {
      yearMonth: yearMonthStr,
      totalExpense,
      totalIncome,
      monthlyBudget,
      remainingBudget: monthlyBudget - totalExpense,
      budgetUsagePercent: Math.min(Math.round((totalExpense / monthlyBudget) * 100), 200),
      categoryTotals
    };
  }

  // --- EXPORT & IMPORT ---
  exportAllDataJSON() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      tasks: this.getTasks(),
      expenses: this.getExpenses(),
      incomes: this.getIncomes(),
      streaks: this.getStreakCount()
    };
    return JSON.stringify(data, null, 2);
  }

  importAllDataJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.tasks) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      if (data.expenses) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
      if (data.incomes) localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(data.incomes));
      if (data.streaks) localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify(data.streaks));
      this.pushDataToServer();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  exportExpensesCSV() {
    const expenses = this.getExpenses();
    const headers = ['ID', 'Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Routine Linked', 'Notes'];
    const rows = expenses.map(e => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category || ''}"`,
      e.amount,
      `"${e.paymentMethod || ''}"`,
      e.isRoutineLinked ? 'Yes' : 'No',
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }

  // Push local state to server backup (strictly partitioned by user)
  async pushDataToServer() {
    // CRITICAL SECURITY: Never push guest trial data to the backend server
    if (this.isCurrentGuest()) {
      return;
    }
    try {
      const user = this.getCurrentSessionUser();
      const isOwner = this.isCurrentOwner();
      const userId = isOwner ? 'user-mukiviswa' : (user ? (user.id || user.username) : 'user-mukiviswa');

      const now = Date.now();
      localStorage.setItem('taskcost_last_updated_' + userId, String(now));

      const isFile = window.location.protocol === 'file:';
      const syncUrl = isFile ? 'http://localhost:3000/api/sync' : '/api/sync';

      const allExpenses = this.getExpenses();
      // SAFEGUARD: Never overwrite owner server backup if local expenses is suspiciously low (< 50)
      if (isOwner && allExpenses.length < 50) {
        console.warn('[Sync] Blocked pushDataToServer: Owner expenses count abnormally low (' + allExpenses.length + ')');
        return;
      }

      const payload = {
        userId: userId,
        updatedAt: now,
        settings: this.getSettings(),
        tasks: this.getTasks(),
        expenses: allExpenses,
        incomes: this.getIncomes(),
        streaks: this.getStreakCount()
      };

      await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`[Sync] Pushed ${allExpenses.length} expenses for ${userId} to server backup (updatedAt: ${now})`);
    } catch (e) {
      // Offline / standalone file mode silent catch
    }
  }

  // Background sync with backend (strictly partitioned by user)
  async syncWithServer() {
    // CRITICAL SECURITY: Never mirror server data into a Guest session!
    if (this.isCurrentGuest()) {
      return;
    }
    try {
      const user = this.getCurrentSessionUser();
      const isOwner = this.isCurrentOwner();
      const userId = isOwner ? 'user-mukiviswa' : (user ? (user.id || user.username) : 'user-mukiviswa');

      const isFile = window.location.protocol === 'file:';
      const baseUrl = isFile ? 'http://localhost:3000/api/sync' : '/api/sync';
      const syncUrl = `${baseUrl}?userId=${encodeURIComponent(userId)}`;

      const resp = await fetch(syncUrl);
      if (!resp.ok) return;
      const resData = await resp.json();
      if (!resData || !resData.success || !resData.data) return;

      const serverData = resData.data;
      if (!serverData.expenses || !Array.isArray(serverData.expenses)) return;

      const localExpenses = this.getExpenses();
      const localUpdated = parseInt(localStorage.getItem('taskcost_last_updated_' + userId) || '0', 10);
      const serverUpdated = parseInt(serverData.updatedAt || '0', 10);

      const expKey = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);
      const tasksKey = this.getUserStorageKey(STORAGE_KEYS.TASKS);
      const incomesKey = this.getUserStorageKey(STORAGE_KEYS.INCOMES);
      const streaksKey = this.getUserStorageKey(STORAGE_KEYS.STREAKS);
      const settingsKey = this.getUserStorageKey(STORAGE_KEYS.SETTINGS);

      // Adopt server data if:
      // 1. Server has more expenses than local (e.g. added from phone)
      // 2. OR For Owner: server has full records (>=50) and local has fewer records (<50)
      // 3. OR Server has a strictly newer timestamp from phone/another device
      // 4. OR Local has 0 expenses and server has expenses
      const hasMoreExpensesOnServer = serverData.expenses.length > localExpenses.length;
      const isOwnerAdopt = isOwner && (
        hasMoreExpensesOnServer ||
        (serverData.expenses.length >= 50 && localExpenses.length < 50) ||
        (localExpenses.length === 0 && serverData.expenses.length > 0) ||
        (serverData.expenses.length >= localExpenses.length && serverUpdated >= localUpdated)
      );
      const shouldAdoptServer = isOwnerAdopt || 
                                hasMoreExpensesOnServer ||
                                (localExpenses.length === 0 && serverData.expenses.length > 0) ||
                                (serverUpdated > 0 && serverUpdated > localUpdated);

      if (shouldAdoptServer) {
        const diffCount = serverData.expenses.length - localExpenses.length;
        localStorage.setItem(expKey, JSON.stringify(serverData.expenses));
        if (serverData.tasks) localStorage.setItem(tasksKey, JSON.stringify(serverData.tasks));
        if (serverData.incomes) localStorage.setItem(incomesKey, JSON.stringify(serverData.incomes));
        if (serverData.settings) localStorage.setItem(settingsKey, JSON.stringify(serverData.settings));
        if (serverData.streaks) localStorage.setItem(streaksKey, JSON.stringify(serverData.streaks));
        if (serverUpdated > 0) localStorage.setItem('taskcost_last_updated_' + userId, String(serverUpdated));

        // Immediately refresh UI metrics
        if (window.app && window.app.updateSummaryMetrics) window.app.updateSummaryMetrics();
        if (window.tasks && window.tasks.render) window.tasks.render();
        if (window.expenses && window.expenses.render) window.expenses.render();
        if (window.charts && window.charts.renderAll) window.charts.renderAll();

        if (diffCount > 0 && window.showToast && localExpenses.length > 0) {
          window.showToast(`📲 Auto-synced! ${diffCount} new record(s) updated from phone.`, 'success');
        }
        return;
      }

      // If local is newer than server or server doesn't have an updatedAt timestamp yet, push local to server
      if (localUpdated > serverUpdated || (!serverData.updatedAt && localExpenses.length > 0)) {
        await this.pushDataToServer();
      }
    } catch (e) {
      // Offline or standalone file mode; silent catch
    }
  }
  // Explicit function to push file:// data to localhost server
  async pushFileToLiveServer() {
    try {
      await this.syncWithServer();
      const allExpenses = this.getExpenses();
      const banner = document.getElementById('file-sync-banner');
      if (banner) {
        banner.innerHTML = `<i class="fa-solid fa-circle-check"></i> All ${allExpenses.length} records synced with server!`;
        banner.style.background = '#10b981';
      }
    } catch (e) {
      console.warn('[Sync] Could not push to server:', e);
    }
  }
}

// Global instance
window.storage = new StorageManager();

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIC CROSS-DEVICE LIVE SYNC (Phone <-> Laptop instant reflection)
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  // Sync immediately when switching back to the app window/tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.storage && typeof window.storage.syncWithServer === 'function') {
      window.storage.syncWithServer();
    }
  });

  window.addEventListener('focus', () => {
    if (window.storage && typeof window.storage.syncWithServer === 'function') {
      window.storage.syncWithServer();
    }
  });

  // Background poll every 10 seconds for real-time live reflection
  setInterval(() => {
    if (!document.hidden && window.storage && typeof window.storage.syncWithServer === 'function') {
      window.storage.syncWithServer();
    }
  }, 10000);
}
