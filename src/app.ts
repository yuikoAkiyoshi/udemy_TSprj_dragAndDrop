// 型定義
enum ProjectStatus {
    Active, Finished
}
class Project {
    constructor(
        public id: string,
        public title: string,
        public description: string,
        public manday: number,
        public status: ProjectStatus,
    ){}
}

type Listener = (items: Project[]) => void;

//状態(state)を管理するclass
class ProjectState {
    private listeners: Listener[] = [];
    private projects: Project[] = [];

    //インスタンスを保持するためのプロパティ
    private static instance: ProjectState;

    //privateなコンストラクターにすることで、シングルトン＝一つのインスタンスしかないことを保証
    private constructor(){

    }

    static getInstance() {
        //すでにインスタンスが村んざいすればそのインスタンスを
        if(this.instance) {
            return this.instance;
        }
        //まだインスタンスが存在しなければ新しくインスタンスを作成して返す
        this.instance = new ProjectState();
        return this.instance;
    }

    addListener(listenerFn: Listener) {
        this.listeners.push(listenerFn);
    }

    addProject(title: string, description:string, manday: number){
        const newProject = new Project(
            Math.random().toString(),
            title,
            description,
            manday,
            ProjectStatus.Active
        );
        this.projects.push(newProject);
        for (const listenerFn of this.listeners) {
            listenerFn(this.projects.slice());
        }
    }
}

const projectState = ProjectState.getInstance();

//バリデーション
interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate(validatableInput: Validatable) {
    let isValid = true;
    if(validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if(validatableInput.minLength !=null && typeof validatableInput.value === "string"){
        isValid = isValid && validatableInput.value.length >= validatableInput.minLength;
    }
    if(validatableInput.maxLength !=null && typeof validatableInput.value === "string"){
        isValid = isValid && validatableInput.value.length <= validatableInput.maxLength;
    }
    if(validatableInput.min !=null && typeof validatableInput.value === "number"){
        isValid = isValid && validatableInput.value >= validatableInput.min;
    }
    if(validatableInput.max !=null && typeof validatableInput.value === "number"){
        isValid = isValid && validatableInput.value <= validatableInput.max;
    }
    return isValid;
}
//デコレーター
function autobind(_: any, _2:string, descriptor: PropertyDescriptor){
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        get() {
            const boundFn = originalMethod.bind(this);
            return boundFn;
        },
    };
return adjDescriptor;
}

//一覧表示させるためのclass
class ProjectList {
    templateElement: HTMLTemplateElement;
    hostElement: HTMLDivElement;
    element: HTMLElement;
    assignedProjects: Project[]; 

    constructor(private type: 'active' | 'finished' ) {
        this.templateElement = document.getElementById('project-list')! as HTMLTemplateElement;
        this.hostElement = document.getElementById('app')! as HTMLDivElement;
        this.assignedProjects = [];

        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild as HTMLElement;
        this.element.id = `${this.type}-projects`;

        projectState.addListener((projects: Project[])=>{
            this.assignedProjects = projects;
            this.renderProjects();
        });

        this.attach();
        this.renderContent();
    }

    private renderProjects() {
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        for(const prjItem of this.assignedProjects) {
            const listItem = document.createElement('li');
            listItem.textContent = prjItem.title;
            listEl.appendChild(listItem);
        }
    }

    private renderContent() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul')!.id = listId;
        this.element.querySelector('h2')!.textContent = this.type === 'active' ? '実行中' : '完了';
    }

    private attach(){
        this.hostElement.insertAdjacentElement('beforeend', this.element);
    }
}


//プロジェクトのフォームとインプット値の取得のためのclass
class ProjectInput {
    templateElement: HTMLTemplateElement;
    hostElement: HTMLDivElement;
    element: HTMLFormElement;
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    manDayInputElement: HTMLInputElement;

    constructor(){
        this.templateElement = document.getElementById('project-input')! as HTMLTemplateElement;
        this.hostElement = document.getElementById('app')! as HTMLDivElement;

        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild as HTMLFormElement;
        this.element.id = 'user-input';

        this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement;
        this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement;
        this.manDayInputElement = this.element.querySelector('#manday') as HTMLInputElement;

        this.configure();
        this.attach();
    }

    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredManday = this.manDayInputElement.value;

        const titleValidatable: Validatable = {
            value: enteredTitle,
            required: true,
        };
        const descriptionValidatable: Validatable = {
            value: enteredDescription,
            required: true,
            minLength: 5
        };
        const mandayValidatable: Validatable = {
            value: +enteredManday,
            required: true,
            min: 1,
            max: 1000
        };

        if(!validate(titleValidatable) || !validate(descriptionValidatable) || !validate(mandayValidatable) )
        {
            alert('error');
            return;
        } else {
            return [enteredTitle,enteredDescription,+enteredManday]
        }
    }

    private clearInputs() {
        this.titleInputElement.value = '';
        this.descriptionInputElement.value = '';
        this.manDayInputElement.value = '';
    }

    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if(Array.isArray(userInput)){
            const [title,desc,manday] = userInput;
            projectState.addProject(title,desc,manday);
            this.clearInputs();
        }
    }

    private configure(){
        this.element.addEventListener('submit', this.submitHandler.bind(this));
    }

    private attach(){
        this.hostElement.insertAdjacentElement('afterbegin', this.element);
    }
}

const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active');
const finishPrjList = new ProjectList('finished');