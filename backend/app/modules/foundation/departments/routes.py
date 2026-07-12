from fastapi import APIRouter

from .schemas import DepartmentCreate
from .repository import *

router = APIRouter(
    prefix="/api/v1/departments",
    tags=["Departments"]
)


@router.get("")
def list_departments():

    rows = get_departments()

    result=[]

    for row in rows:

        result.append({

            "department_id":row[0],

            "name":row[1],

            "code":row[2],

            "status":row[3]

        })

    return result


@router.post("")
def add_department(department:DepartmentCreate):

    department_id=create_department(department)

    return{

        "message":"Department created successfully",

        "department_id":department_id

    }