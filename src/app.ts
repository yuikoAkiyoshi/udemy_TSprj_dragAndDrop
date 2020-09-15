//ドラッグ&ドロップ
interface Draggable {
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
    dragOverHandler(event:DragEvent): void;//その場所が有効なドロップ対象であるかどうかを判断
    dropHandler(event: DragEvent): void;//実際にドロップが起きた時に呼ばれるイベントハンドラー
    dragLeaveHandler(event: DragEvent): void;//表示に関し便利なハンドラー。ドラッグが起きる時に背景色変えたり、途中でやめた時に表示元に戻したり。
}


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

type Listener<T> = (items: T[]) => void;

//stateの共通化
class　State<T> {

    protected listeners: Listener<T>[] = [];//protectedにすると継承先でも使える

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn);
    }
}

//状態(state)を管理するclass
class ProjectState extends State<Project> {
    private projects: Project[] = [];

    //インスタンスを保持するためのプロパティ
    private static instance: ProjectState;

    //privateなコンストラクターにすることで、シングルトン＝一つのインスタンスしかないことを保証
    private constructor(){
        super();
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

    addProject(title: string, description:string, manday: number){
        const newProject = new Project(
            Math.random().toString(),
            title,
            description,
            manday,
            ProjectStatus.Active
        );
        this.projects.push(newProject);
        this.updateListeners();
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
            this.updateListeners();
        }
    }

    private updateListeners() {
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
    if (validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if (validatableInput.minLength !=null && typeof validatableInput.value === "string"){
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

//DOM取得、表示を担当するclass
// 必ず継承されて使われるので抽象クラスとして作成
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;//div要素かもしれないし、そうじゃないかもしれない
    element: U;//form要素かもしれないし,そうじゃないかもしれない

    constructor(
        templateId: string,
        hostElementID: string,
        insertAtStart: boolean,
        newElementId?: string//任意の引数は常に最後に記述
        ) {
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementID)! as T;

        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild as U;
        if(newElementId){
            this.element.id = newElementId;
        }

        this.attach(insertAtStart);
    }

    //継承したクラスでメソッドを実装することを強制
    abstract configure(): void;
    abstract renderContent(): void;

    private attach(insertAtBeginning: boolean){
        this.hostElement.insertAdjacentElement(insertAtBeginning ? 'afterbegin' : 'beforeend', this.element);
    }
}

// リストに追加するアイテムを作成するclass
class ProjectItem extends Component<HTMLUListElement,HTMLLIElement> implements Draggable{
    private project: Project;

    get manday(){
        if(this.project.manday < 20) {
            return this.project.manday.toString() + '人日'
        } else {
            return (this.project.manday / 20).toString() + '人月'
        }
    }

    constructor(hostId: string, project: Project){
        super('single-project', hostId, false, project.id);   
        this.project = project; 

        this.configure();
        this.renderContent();
    }

    @autobind
    dragStartHandler(event: DragEvent){
        event.dataTransfer!.setData('text/plain', this.project.id);
        event.dataTransfer!.effectAllowed = 'move';
    }
    dragEndHandler(_: DragEvent){
        console.log('end');
    }

    configure(){
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);
    }

    renderContent(){
        this.element.querySelector('h2')!.textContent = this.project.title;
        this.element.querySelector('h3')!.textContent = this.manday//getterはプロパティのように呼び出せる
        this.element.querySelector('p')!.textContent = this.project.description;
    }
}


//一覧表示させるためのclass
class ProjectList extends Component<HTMLTemplateElement,HTMLElement > implements DragTarget{
    assignedProjects: Project[]; 

    constructor(private type: 'active' | 'finished' ) {
        super('project-list', 'app', false, `${type}-projects` )
        this.assignedProjects = [];

        this.configure();
        this.renderContent();
    }

    @autobind
    dragOverHandler(event: DragEvent) {
        if(event.dataTransfer && event.dataTransfer.types[0] === 'text/plain'){//ここでは写真とかのドラッグは非許可
            event.preventDefault();//dropを許可（jsデフォルトではドロップは許可されていない）
            const listEl = this.element.querySelector('ul')!;
            listEl.classList.add('droppable');
        }
    }

    @autobind
    dropHandler(event: DragEvent) {
        const prjId = event.dataTransfer!.getData('text/plain');
        projectState.moveProject(
            prjId,
            this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished,
        );
    }

    @autobind
    dragLeaveHandler(_: DragEvent) {
        const listEl = this.element.querySelector('ul')!;
        listEl.classList.remove('droppable');
    }

    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('drop', this.dropHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);

        projectState.addListener((projects: Project[])=>{
            // 実行中・完了のフィルタリング実装
            const relevantProjects = projects.filter(prj => {
                if(this.type === 'active') {
                    return prj.status === ProjectStatus.Active;
                }
                return prj.status === ProjectStatus.Finished;
            });
            this.assignedProjects = relevantProjects;
            this.renderProjects();
        });
    }

    renderContent() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul')!.id = listId;
        this.element.querySelector('h2')!.textContent = this.type === 'active' ? '実行中' : '完了';
    }

    private renderProjects() {
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        listEl.innerHTML = '';
        for(const prjItem of this.assignedProjects) {
            new ProjectItem(listEl.id, prjItem);
        }
    }
}


//プロジェクトのフォームとインプット値の取得のためのclass
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    manDayInputElement: HTMLInputElement;

    constructor(){
        super('project-input','app', true, 'user-input');

        this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement;
        this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement;
        this.manDayInputElement = this.element.querySelector('#manday') as HTMLInputElement;

        this.configure();
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

    configure(){
        this.element.addEventListener('submit', this.submitHandler.bind(this));
    }

    renderContent(){}//TSエラー解消のため（抽象クラスはextend先で実装しなければならないという制約）

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
}

const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active');
const finishPrjList = new ProjectList('finished');