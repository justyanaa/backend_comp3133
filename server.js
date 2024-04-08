import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { mongoose } from 'mongoose';
const EmployeeSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        match: /^\S+@\S+\.\S+$/,
        unique: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    salary: {
        type: Number,
        required: true
    }
});

const Employees = mongoose.model('Employees', EmployeeSchema);

const Users= new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minLength: 4,
        unique: true,
        primaryKey: true
    },
    email: {
        type: String,
        required: true,
        match: /^\S+@\S+\.\S+$/,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})

const User = mongoose.model('User', Users);

const typeDefs = `
type employee{
    _id:String!
    first_name: String!
    last_name: String!
    email: String!
    gender: String!
    salary: Float!
}
type user{
    username: String!
    email: String!
    password: String!
}
  type Query {
    hello: String!
    getAllEmployee: [employee]
    searchById(id:String!): employee
    loginUser(username: String!, password:String!): String
  },
  type Mutation{
    addEmployee(first_name: String!, last_name: String!, email: String!, gender: String!, salary: Float!): String!
    signUp(username: String!,email: String!, password: String!): String!
    updateEmployeeById(_id: String!,first_name: String!, last_name: String!, email: String!, gender: String!, salary: Float!): String!
    deleteEmployeeById(_id: String!): String!
  }
`;



const app = express();

const httpServer = http.createServer(app);
mongoose.connect('mongodb+srv://admin:admin@cluster0.kpg90l5.mongodb.net/assignment2_comp3133?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const server = new ApolloServer({
  typeDefs,
   resolvers: {
    Query: {
      getAllEmployee: async()=>{
        return await Employees.find({});
      },
      searchById: async (_,args)=>{
        return await Employees.findById(args.id)
      },

      loginUser: async(_,args)=>{
        const users = await User.find().where({
            $and: [
                {
                    $or: [
                        { username: args.username },
                        { email: args.username }
                    ]
                },
                { password: args.password }
            ]
        }).exec();
        if (users.length === 0) {
            return "Check the username and password";
        } else {
            return "Sucessful"; 
        }
      }
    },
    Mutation:{
        addEmployee: async (_,args) =>{
           
            const emp = new Employees(
                {
                first_name: args.first_name,
                last_name: args.last_name,
                email: args.email,
                gender: args.gender,
                salary: args.salary,
                }
            )
            try{
               await emp.save();
                return "Employee added sucessfully"
            }catch(err){
                return err.message
            }
        },
        signUp: async (_,args)=>{
            const usr = new User({
                ...args
            })
            try{
                await usr.save();
                 return "User added sucessfully"
             }catch(err){
                 return err.message
             }

        },
        deleteEmployeeById: async (_, args) => {
            try {
                console.log(args._id);
                const employee = await Employees.findByIdAndDelete(args._id);
                console.log(employee)
                if (!employee) {
                    throw new Error("Employee not found");
                }
                return "Employee deleted successfully";
            } catch (error) {
                console.error("Error deleting employee:", error);
                throw error;
            }
        },updateEmployeeById: async (_, args) => {
          
                const emp = {
                    first_name: args.first_name,
                    last_name: args.last_name,
                    email: args.email,
                    gender: args.gender,
                    salary: args.salary,
                };
        
                const employ= await Employees.findByIdAndUpdate(args._id, emp, { new: true });
               
                console.log(employ)
                if (!employ) {
                    return "Employee not found"
                }
                return "Employ updated";
          
        }
        
        
        
    }
  },
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();


app.use(
  '/',
  cors(),
  express.json(),

  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
  }),
);


await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));

console.log(` Server ready at http://localhost:4000/`);
